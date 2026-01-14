/**
 * Autopilot Loop - Main Autonomous Engine
 * 
 * This endpoint is triggered by Supabase cron (hourly)
 * It orchestrates the entire autonomous posting flow:
 * 1. Check if autopilot is enabled
 * 2. Check if it's time to post (schedule)
 * 3. Select topic intelligently
 * 4. Generate post using AI
 * 5. Validate output
 * 6. Publish to connected accounts
 * 7. Log results
 * 
 * NO USER INTERACTION REQUIRED
 */

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { selectNextTopic, extractRecentTopics } from '@/lib/autopilot/topicSelector'
import { generateContent } from '@/lib/ai/generator'
import { publishToX } from '@/lib/platforms/x'
import { publishToTelegram } from '@/lib/platforms/telegram'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max execution

export async function POST(request: Request) {
  console.log('=== AUTOPILOT RUN STARTED ===')
  console.log('Timestamp:', new Date().toISOString())
  
  const supabase = createServiceClient()
  
  try {
    // Get all users with autopilot enabled
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, ai_provider, topics, tone, autopilot_enabled')
      .eq('autopilot_enabled', true)
    
    if (usersError) {
      console.error('Failed to fetch users:', usersError)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }
    
    if (!users || users.length === 0) {
      console.log('No users with autopilot enabled')
      return NextResponse.json({ message: 'No users with autopilot enabled' })
    }
    
    console.log(`Found ${users.length} user(s) with autopilot enabled`)
    
    const results = []
    
    // Process each user
    for (const user of users) {
      console.log(`\n--- Processing user: ${user.id} ---`)
      
      try {
        // Check if user has schedule configured
        const { data: schedule } = await supabase
          .from('schedule_config')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (!schedule) {
          console.log('No schedule configured for user')
          await logPipeline(supabase, user.id, 'planning', 'warning', 'No schedule configured')
          continue
        }
        
        // Check if it's time to post
        const shouldPost = checkSchedule(schedule)
        
        if (!shouldPost) {
          console.log('Not time to post according to schedule')
          continue
        }
        
        console.log('✓ Schedule check passed, proceeding with generation')
        
        // Get recent posts to avoid repetition
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('topic, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        const recentTopics = extractRecentTopics(recentPosts || [])
        const recentContents = (recentPosts || []).map(p => p.content)
        
        // Select next topic intelligently
        const { topic, reason } = await selectNextTopic(user.topics || [], recentTopics)
        console.log(`Selected topic: "${topic}" - ${reason}`)
        
        await logPipeline(supabase, user.id, 'planning', 'success', `Topic selected: ${topic}`, { topic, reason })
        
        // Generate content
        console.log('Generating content...')
        const { content, prompt, model } = await generateContent(user.id, {
          topic,
          tone: user.tone || 'professional',
          recentPosts: recentContents,
        })
        
        console.log(`✓ Content generated (${content.length} chars)`)
        await logPipeline(supabase, user.id, 'generation', 'success', 'Content generated', { model, contentLength: content.length })
        
        // Validate content
        if (!content || content.trim().length === 0) {
          throw new Error('Generated content is empty')
        }
        
        if (content.length > 280) {
          console.warn('Content exceeds 280 chars, truncating...')
        }
        
        // Get connected accounts
        const { data: accounts } = await supabase
          .from('connected_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        
        if (!accounts || accounts.length === 0) {
          await logPipeline(supabase, user.id, 'publishing', 'warning', 'No connected accounts')
          continue
        }
        
        // Publish to each account
        for (const account of accounts) {
          console.log(`Publishing to ${account.platform} (${account.username})...`)
          
          try {
            let publishResult
            
            if (account.platform === 'x') {
              publishResult = await publishToX(account.access_token, content)
            } else if (account.platform === 'telegram') {
              publishResult = await publishToTelegram(account.access_token, content)
            } else {
              throw new Error(`Unsupported platform: ${account.platform}`)
            }
            
            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Unknown error')
            }
            
            // Save post record
            const { error: postError } = await supabase
              .from('posts')
              .insert({
                user_id: user.id,
                account_id: account.id,
                status: 'published',
                content,
                platform: account.platform,
                published_at: new Date().toISOString(),
                platform_post_id: publishResult.platformPostId,
                generation_prompt: prompt,
                generation_model: model,
                topic,
              })
            
            if (postError) {
              console.error('Failed to save post record:', postError)
            } else {
              console.log(`✓ Published successfully (ID: ${publishResult.platformPostId})`)
              await logPipeline(supabase, user.id, 'publishing', 'success', `Published to ${account.platform}`, { 
                platform: account.platform,
                postId: publishResult.platformPostId
              })
            }
          } catch (publishError) {
            console.error(`Failed to publish to ${account.platform}:`, publishError)
            await logPipeline(supabase, user.id, 'publishing', 'error', `Failed to publish to ${account.platform}: ${publishError instanceof Error ? publishError.message : 'Unknown'}`)
            
            // Save failed post record
            await supabase
              .from('posts')
              .insert({
                user_id: user.id,
                account_id: account.id,
                status: 'failed',
                content,
                platform: account.platform,
                generation_prompt: prompt,
                generation_model: model,
                topic,
              })
          }
        }
        
        results.push({ userId: user.id, status: 'completed' })
        
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        await logPipeline(supabase, user.id, 'generation', 'error', userError instanceof Error ? userError.message : 'Unknown error')
        results.push({ userId: user.id, status: 'error', error: userError instanceof Error ? userError.message : 'Unknown' })
      }
    }
    
    console.log('\n=== AUTOPILOT RUN COMPLETED ===')
    return NextResponse.json({ 
      success: true,
      processed: users.length,
      results
    })
    
  } catch (error) {
    console.error('Autopilot run failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

/**
 * Check if current time matches schedule
 * Returns true if we should post now
 */
function checkSchedule(schedule: any): boolean {
  const now = new Date()
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()]
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  // Check if today is in selected days
  const selectedDays = schedule.days_of_week || []
  if (!selectedDays.includes(dayOfWeek)) {
    return false
  }
  
  // Check if current time matches any configured time (within 1 hour window)
  const times = schedule.times || []
  for (const timeStr of times) {
    const [hour, minute] = timeStr.split(':').map(Number)
    
    // Post if we're within the same hour as scheduled time
    if (currentHour === hour) {
      return true
    }
  }
  
  return false
}

/**
 * Log pipeline step to database
 */
async function logPipeline(
  supabase: any,
  userId: string,
  step: string,
  status: string,
  message: string,
  metadata?: any
) {
  await supabase
    .from('pipeline_logs')
    .insert({
      user_id: userId,
      step,
      status,
      message,
      metadata: metadata || {},
    })
}

