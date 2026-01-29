/**
 * Workflow Runner - Automatic Post Generation & Publishing
 *
 * Called by Supabase cron every 5 minutes.
 * Checks if current time matches any user's scheduled posting time,
 * generates content, and publishes immediately to X, Telegram, and LinkedIn.
 *
 * Key features:
 * - Respects user timezone
 * - Idempotent (uses workflow_runs table to prevent duplicates)
 * - Exits immediately if autopilot is OFF
 * - No future scheduling - publishes at execution time
 */

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkTimeMatch, logPipeline, shouldGenerateImageForTime, type ScheduleConfig } from '@/lib/autopilot/workflow-helpers'
import { generateContent } from '@/lib/ai/generator'
import { publishToX } from '@/lib/platforms/x'
import { publishToTelegram } from '@/lib/platforms/telegram'
import { publishToLinkedIn } from '@/lib/platforms/linkedin'
import { createPlatformVariants } from '@/lib/platforms/transformers'
import { generateImageWithStability } from '@/lib/ai/providers/stability-image'
import { uploadImageToStorage } from '@/lib/storage/image-upload'
import type { PublishArgs } from '@/lib/pipeline/types'
import type { Database, Json } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 60

// Types derived from Database for type safety
type PostInsert = Database['public']['Tables']['posts']['Insert']
type WorkflowRunInsert = Database['public']['Tables']['workflow_runs']['Insert']
type PipelineLogInsert = Database['public']['Tables']['pipeline_logs']['Insert']
type Platform = Database['public']['Tables']['posts']['Row']['platform']
type PostStatus = Database['public']['Tables']['posts']['Row']['status']
type WorkflowStatus = Database['public']['Tables']['workflow_runs']['Row']['status']
type PipelineStep = Database['public']['Tables']['pipeline_logs']['Row']['step']
type PipelineStatus = Database['public']['Tables']['pipeline_logs']['Row']['status']

// Types for database queries
type UserProfile = {
  id: string
  tone: string | null
  autopilot_enabled: boolean | null
}

type ConnectedAccount = {
  id: string
  platform: Platform
  access_token: string
  platform_user_id: string
  username: string
  token_expires_at: string | null
}

type RecentPost = {
  content: string
}

export async function POST() {
  console.log('=== WORKFLOW RUN STARTED ===')
  console.log('Timestamp:', new Date().toISOString())
  
  const supabase = createServiceClient()
  const results: Array<{ userId: string; status: string; error?: string; timeSlot?: string }> = []
  
  try {
    // Step 1: Get all users with autopilot enabled
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, tone, autopilot_enabled')
      .eq('autopilot_enabled', true)
    
    if (usersError) {
      console.error('Failed to fetch users:', usersError)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }
    
    if (!users || users.length === 0) {
      console.log('No users with autopilot enabled')
      return NextResponse.json({ message: 'No users with autopilot enabled', processed: 0 })
    }
    
    console.log(`Found ${users.length} user(s) with autopilot enabled`)
    
    // Step 2: Process each user
    for (const user of users as UserProfile[]) {
      console.log(`\n--- Processing user: ${user.id} ---`)
      
      try {
        // Get user's schedule configuration
        const { data: scheduleData } = await supabase
          .from('schedule_config')
          .select('days_of_week, times, timezone, image_generation_enabled, image_times')
          .eq('user_id', user.id)
          .single()
        
        const schedule = scheduleData as ScheduleConfig | null
        
        if (!schedule || !schedule.times || schedule.times.length === 0) {
          console.log('No schedule configured for user')
          await logPipeline(supabase, user.id, 'planning', 'warning', 'No schedule configured')
          results.push({ userId: user.id, status: 'skipped', error: 'No schedule configured' })
          continue
        }
        
        // Check if current time matches schedule
        const matchResult = checkTimeMatch(schedule)
        
        if (!matchResult.matches) {
          console.log(`Not time to post. Current: ${matchResult.currentTime}, Schedule: ${schedule.times.join(', ')}`)
          results.push({ userId: user.id, status: 'skipped', error: 'Not time to post' })
          continue
        }
        
        console.log(`✓ Time matches schedule: ${matchResult.matchedTime}`)
        
        // Check for duplicate execution (idempotency)
        const timeSlot = matchResult.timeSlot
        const { data: existingRun } = await supabase
          .from('workflow_runs')
          .select('id')
          .eq('user_id', user.id)
          .eq('time_slot', timeSlot)
          .single()
        
        if (existingRun) {
          console.log(`Already executed for time slot: ${timeSlot}`)
          results.push({ userId: user.id, status: 'skipped', error: 'Already executed', timeSlot })
          continue
        }
        
        console.log(`✓ No duplicate found for time slot: ${timeSlot}`)
        
        // Get connected accounts (X, Telegram, and LinkedIn)
        const { data: accountsData } = await supabase
          .from('connected_accounts')
          .select('id, platform, access_token, platform_user_id, username, token_expires_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('platform', ['x', 'telegram', 'linkedin'])
        
        const accounts = accountsData as ConnectedAccount[] | null
        
        if (!accounts || accounts.length === 0) {
          console.log('No active accounts (X, Telegram, or LinkedIn)')
          await logPipeline(supabase, user.id, 'publishing', 'warning', 'No active accounts')
          results.push({ userId: user.id, status: 'skipped', error: 'No accounts connected' })
          continue
        }
        
        // Get recent posts to avoid repetition
        const { data: recentPostsData } = await supabase
          .from('posts')
          .select('content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        const recentPosts = recentPostsData as RecentPost[] | null
        const recentContents = (recentPosts || []).map(p => p.content)
        
        console.log('Generating content using full training data...')
        await logPipeline(supabase, user.id, 'planning', 'success', 'Starting content generation with training data')
        
        // Check if we should generate an image for this time slot
        const shouldGenerateImage = shouldGenerateImageForTime(schedule, matchResult.matchedTime)
        console.log(`Image generation: ${shouldGenerateImage ? 'ENABLED' : 'DISABLED'} for time ${matchResult.matchedTime}`)
        
        // Generate content with Claude - uses full training data from Training section
        console.log('Generating content with Claude...')
        const result = await generateContent(user.id, {
          tone: user.tone || undefined,
          recentPosts: recentContents,
          generateImagePrompt: shouldGenerateImage,
        })
        
        const masterContent = result.content
        const prompt = result.prompt
        const model = result.model
        let imagePrompt = result.imagePrompt
        
        console.log(`✓ Content generated (${masterContent.length} chars)`)
        if (imagePrompt) {
          console.log(`✓ Image prompt generated (${imagePrompt.length} chars)`)
        }
        await logPipeline(supabase, user.id, 'generation', 'success', 'Content generated', {
          model,
          contentLength: masterContent.length,
          hasImagePrompt: !!imagePrompt
        })
        
        // SIMPLIFIED IMAGE GENERATION WORKFLOW
        let imageData: string | undefined
        let imageUrl: string | undefined
        
        if (shouldGenerateImage && imagePrompt) {
          console.log('[Workflow] Image generation REQUIRED for this time slot')
          
          // Check if Stability API key is configured (built-in environment variable)
          const stabilityApiKey = process.env.STABILITY_API_KEY
          
          if (!stabilityApiKey) {
            console.error('[Workflow] STABILITY_API_KEY not configured in environment variables')
            await logPipeline(supabase, user.id, 'generation', 'error',
              'Image generation failed: STABILITY_API_KEY not configured')
          } else {
            try {
              console.log('[Workflow] SIMPLIFIED image pipeline:')
              console.log('[Workflow] Step 1: Claude generates post content ✓')
              console.log('[Workflow] Step 2: Claude creates image prompt ✓')
              console.log('[Workflow] Step 3: Stability AI generates image...')
              
              // Generate image with Stability AI (using built-in API key)
              const stabilityResult = await generateImageWithStability({
                prompt: imagePrompt,
                apiKey: stabilityApiKey,
              })
              
              if (stabilityResult.success && stabilityResult.base64Data) {
                imageData = stabilityResult.base64Data
                console.log('[Workflow] ✓ Image generated by Stability AI!')
                console.log('[Workflow] Step 4: Uploading image to Supabase Storage...')
                
                // Upload to Supabase Storage to get public URL
                const uploadResult = await uploadImageToStorage(
                  stabilityResult.base64Data,
                  user.id
                )
                
                if (uploadResult.success && uploadResult.publicUrl) {
                  imageUrl = uploadResult.publicUrl
                  console.log('[Workflow] ✓ Image uploaded! URL:', imageUrl)
                  
                  await logPipeline(supabase, user.id, 'generation', 'success',
                    'Image pipeline successful', {
                      imagePrompt: imagePrompt.substring(0, 200),
                      imageUrl,
                      hasImageData: true
                    })
                } else {
                  console.error('[Workflow] Image upload failed:', uploadResult.error)
                  await logPipeline(supabase, user.id, 'generation', 'warning',
                    `Image generated but upload failed: ${uploadResult.error}`)
                }
              } else {
                console.error('[Workflow] Stability AI generation failed:', stabilityResult.error)
                await logPipeline(supabase, user.id, 'generation', 'warning',
                  `Stability AI generation failed: ${stabilityResult.error}`)
              }
              
            } catch (imageError) {
              console.error('[Workflow] Image pipeline error:', imageError)
              await logPipeline(supabase, user.id, 'generation', 'error',
                `Image pipeline error: ${imageError instanceof Error ? imageError.message : 'Unknown'}`)
            }
          }
        } else if (shouldGenerateImage && !imagePrompt) {
          console.log('[Workflow] Image generation enabled but Claude did not create prompt')
        } else {
          console.log('[Workflow] Image generation NOT required for this time slot')
        }
        
        // Create platform variants
        const variants = createPlatformVariants(masterContent)
        
        // Publish to each platform immediately
        const platformsPublished: string[] = []
        
        for (const account of accounts) {
          const platform = account.platform
          let content: string
          
          // Select appropriate content variant for platform
          if (platform === 'x') {
            content = variants.x
          } else if (platform === 'telegram') {
            content = variants.telegram
          } else if (platform === 'linkedin') {
            content = variants.linkedin
          } else {
            console.log(`Unsupported platform: ${platform}`)
            continue
          }
          
          // LinkedIn rate limiting: Max 1 post per 24 hours
          if (platform === 'linkedin') {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            const { data: recentLinkedInPosts } = await supabase
              .from('posts')
              .select('id')
              .eq('user_id', user.id)
              .eq('platform', 'linkedin')
              .eq('status', 'published')
              .gte('published_at', twentyFourHoursAgo)
              .limit(1)
            
            if (recentLinkedInPosts && recentLinkedInPosts.length > 0) {
              console.log(`[LinkedIn] Rate limit: Already posted to LinkedIn in last 24 hours. Skipping.`)
              await logPipeline(supabase, user.id, 'publishing', 'warning',
                'LinkedIn rate limit: Max 1 post per 24 hours. Skipping LinkedIn.')
              continue
            }
          }
          
          console.log(`Publishing to ${platform} (${account.username})...`)
          
          try {
            // Prepare media URLs if image was generated
            const mediaUrls: string[] = []
            if (imageUrl) {
              mediaUrls.push(imageUrl)
              console.log(`[Workflow] Including image URL in post: ${imageUrl}`)
            } else if (imageData) {
              // Image data exists but needs to be uploaded to get a URL
              // For now, log that we have image data
              console.log(`[Workflow] Image data available (${imageData.length} chars) but no URL yet`)
              console.log(`[Workflow] TODO: Upload base64 image to Supabase Storage to get URL`)
            }
            
            const publishArgs: PublishArgs = {
              accessToken: account.access_token,
              platformUserId: account.platform_user_id || account.username,
              content,
              mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
              tokenExpiresAt: account.token_expires_at || null,
            }
            
            console.log(`[Workflow] Publishing with ${mediaUrls.length} media attachment(s)`)
            
            let publishResult
            
            if (platform === 'x') {
              publishResult = await publishToX(publishArgs)
            } else if (platform === 'telegram') {
              publishResult = await publishToTelegram({
                ...publishArgs,
                platformUserId: account.platform_user_id,
              })
            } else if (platform === 'linkedin') {
              publishResult = await publishToLinkedIn(publishArgs)
            } else {
              continue // Skip unsupported platforms
            }
            
            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Unknown error')
            }
            
            // Save published post record
            const publishedPost: PostInsert = {
              user_id: user.id,
              account_id: account.id,
              status: 'published' satisfies PostStatus,
              content,
              platform,
              published_at: new Date().toISOString(),
              platform_post_id: publishResult.postId,
              generation_prompt: prompt,
              generation_model: model,
              generation_metadata: {
                master_content: masterContent,
                image_prompt: imagePrompt || null,
                image_generation_enabled: shouldGenerateImage,
                has_image: !!(imageData || imageUrl)
              },
              image_url: imageUrl || null,
              image_data: imageData || null,
            }
            await supabase.from('posts').insert(publishedPost)
            
            console.log(`✓ Published to ${platform} (ID: ${publishResult.postId})`)
            await logPipeline(supabase, user.id, 'publishing', 'success', `Published to ${platform}`, {
              platform,
              postId: publishResult.postId,
            })
            
            platformsPublished.push(platform)
            
          } catch (publishError) {
            console.error(`Failed to publish to ${platform}:`, publishError)
            await logPipeline(supabase, user.id, 'publishing', 'error', 
              `Failed to publish to ${platform}: ${publishError instanceof Error ? publishError.message : 'Unknown'}`)
            
            // Save failed post record
            const failedPost: PostInsert = {
              user_id: user.id,
              account_id: account.id,
              status: 'failed' satisfies PostStatus,
              content,
              platform,
              generation_prompt: prompt,
              generation_model: model,
              generation_metadata: {
                master_content: masterContent,
                image_prompt: imagePrompt || null,
                image_generation_enabled: shouldGenerateImage,
                has_image: !!(imageData || imageUrl)
              },
              image_url: imageUrl || null,
              image_data: imageData || null,
            }
            await supabase.from('posts').insert(failedPost)
          }
        }
        
        // Record workflow run (for idempotency)
        const runStatus: WorkflowStatus = platformsPublished.length > 0 ? 'completed' : 'failed'
        const workflowRun: WorkflowRunInsert = {
          user_id: user.id,
          time_slot: timeSlot,
          status: runStatus,
          platforms_published: platformsPublished,
        }
        await supabase.from('workflow_runs').insert(workflowRun)
        
        results.push({
          userId: user.id,
          status: runStatus,
          timeSlot,
        })
        
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        await logPipeline(supabase, user.id, 'generation', 'error', 
          userError instanceof Error ? userError.message : 'Unknown error')
        results.push({
          userId: user.id,
          status: 'error',
          error: userError instanceof Error ? userError.message : 'Unknown',
        })
      }
    }
    
    console.log('\n=== WORKFLOW RUN COMPLETED ===')
    return NextResponse.json({
      success: true,
      processed: users.length,
      results,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Workflow run failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// Also support GET for easy testing
export async function GET() {
  return POST()
}
