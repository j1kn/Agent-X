/**
 * Workflow Runner - Automatic Post Generation & Publishing
 *
 * Called by Supabase cron every 5 minutes.
 * Checks if current time matches any user's scheduled posting time,
 * generates content, and publishes immediately to X + Telegram.
 *
 * Key features:
 * - Respects user timezone
 * - Idempotent (uses workflow_runs table to prevent duplicates)
 * - Exits immediately if autopilot is OFF
 * - No future scheduling - publishes at execution time
 */

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { selectNextTopic } from '@/lib/autopilot/topicSelector'
import { checkTimeMatch, logPipeline, extractRecentTopics, type ScheduleConfig } from '@/lib/autopilot/workflow-helpers'
import { generateContent } from '@/lib/ai/generator'
import { publishToX } from '@/lib/platforms/x'
import { publishToTelegram } from '@/lib/platforms/telegram'
import { createPlatformVariants } from '@/lib/platforms/transformers'
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
  topics: string[] | null
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
  topic: string | null
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
      .select('id, topics, tone, autopilot_enabled')
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
          .select('days_of_week, times, timezone')
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
        
        // Get connected accounts (X and Telegram only)
        const { data: accountsData } = await supabase
          .from('connected_accounts')
          .select('id, platform, access_token, platform_user_id, username, token_expires_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('platform', ['x', 'telegram'])
        
        const accounts = accountsData as ConnectedAccount[] | null
        
        if (!accounts || accounts.length === 0) {
          console.log('No active X or Telegram accounts')
          await logPipeline(supabase, user.id, 'publishing', 'warning', 'No active accounts')
          results.push({ userId: user.id, status: 'skipped', error: 'No accounts connected' })
          continue
        }
        
        // Get recent posts to avoid repetition
        const { data: recentPostsData } = await supabase
          .from('posts')
          .select('topic, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        const recentPosts = recentPostsData as RecentPost[] | null
        const recentTopics = extractRecentTopics(recentPosts || [])
        const recentContents = (recentPosts || []).map(p => p.content)
        
        // Select topic
        const { topic, reason } = await selectNextTopic(user.topics || [], recentTopics)
        console.log(`Selected topic: "${topic}" - ${reason}`)
        
        await logPipeline(supabase, user.id, 'planning', 'success', `Topic selected: ${topic}`, { topic, reason })
        
        // Generate content
        console.log('Generating content...')
        const { content: masterContent, prompt, model } = await generateContent(user.id, {
          topic,
          tone: user.tone || 'professional',
          recentPosts: recentContents,
        })
        
        console.log(`✓ Content generated (${masterContent.length} chars)`)
        await logPipeline(supabase, user.id, 'generation', 'success', 'Content generated', { model, contentLength: masterContent.length })
        
        // Create platform variants
        const variants = createPlatformVariants(masterContent)
        
        // Publish to each platform immediately
        const platformsPublished: string[] = []
        
        for (const account of accounts) {
          const platform = account.platform
          const content = platform === 'x' ? variants.x : variants.telegram
          
          console.log(`Publishing to ${platform} (${account.username})...`)
          
          try {
            const publishArgs: PublishArgs = {
              accessToken: account.access_token,
              platformUserId: account.platform_user_id || account.username,
              content,
              tokenExpiresAt: account.token_expires_at || null,
            }
            
            let publishResult
            
            if (platform === 'x') {
              publishResult = await publishToX(publishArgs)
            } else if (platform === 'telegram') {
              publishResult = await publishToTelegram({
                ...publishArgs,
                platformUserId: account.platform_user_id,
              })
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
              topic,
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
              topic,
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
