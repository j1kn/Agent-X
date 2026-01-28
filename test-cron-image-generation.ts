/**
 * Test Script for Cron Image Generation
 * 
 * This script tests if the cron job correctly generates images
 * when image_times are configured.
 * 
 * Run with: npx tsx test-cron-image-generation.ts
 */

import { createServiceClient } from './lib/supabase/server'
import { checkTimeMatch, shouldGenerateImageForTime } from './lib/autopilot/workflow-helpers'

async function testCronImageGeneration() {
  console.log('=== Testing Cron Image Generation ===\n')
  
  const supabase = createServiceClient()
  
  // Get users with autopilot enabled
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('autopilot_enabled', true)
  
  if (!users || users.length === 0) {
    console.error('❌ No users with autopilot enabled')
    return
  }
  
  const userId = users[0].id
  console.log(`Testing with user: ${userId}\n`)
  
  // Get schedule configuration
  const { data: schedule } = await supabase
    .from('schedule_config')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (!schedule) {
    console.error('❌ No schedule configured')
    return
  }
  
  console.log('Schedule Configuration:')
  console.log('  Times:', schedule.times)
  console.log('  Image Generation Enabled:', schedule.image_generation_enabled)
  console.log('  Image Times:', schedule.image_times)
  console.log('  Timezone:', schedule.timezone)
  console.log()
  
  // Check current time match
  const matchResult = checkTimeMatch(schedule as any)
  console.log('Current Time Check:')
  console.log('  Current Time:', matchResult.currentTime)
  console.log('  Matches Schedule:', matchResult.matches)
  if (matchResult.matchedTime) {
    console.log('  Matched Time:', matchResult.matchedTime)
  }
  console.log()
  
  // Check if image should be generated
  const shouldGenImage = shouldGenerateImageForTime(schedule as any, matchResult.matchedTime)
  console.log('Image Generation Decision:')
  console.log('  Should Generate Image:', shouldGenImage)
  console.log()
  
  if (!matchResult.matches) {
    console.log('⚠️  Current time does not match schedule')
    console.log('   Wait for one of these times:', schedule.times?.join(', '))
    console.log()
  }
  
  if (matchResult.matches && !shouldGenImage) {
    console.log('✓ Time matches, but image NOT required for this time slot')
    console.log('  This is correct behavior - text-only post will be generated')
    console.log()
  }
  
  if (matchResult.matches && shouldGenImage) {
    console.log('✓ Time matches AND image IS required!')
    console.log('  Cron should generate image for this time slot')
    console.log()
  }
  
  // Check recent workflow runs
  const { data: recentRuns } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log('Recent Workflow Runs:')
  if (recentRuns && recentRuns.length > 0) {
    recentRuns.forEach((run, i) => {
      console.log(`  ${i + 1}. ${run.time_slot} - ${run.status}`)
    })
  } else {
    console.log('  No recent runs')
  }
  console.log()
  
  // Check recent posts with images
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('created_at, platform, image_url, image_data, generation_metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log('Recent Posts:')
  if (recentPosts && recentPosts.length > 0) {
    recentPosts.forEach((post, i) => {
      const hasImage = !!(post.image_url || post.image_data)
      const metadata = post.generation_metadata as any
      console.log(`  ${i + 1}. ${post.created_at}`)
      console.log(`     Platform: ${post.platform}`)
      console.log(`     Has Image: ${hasImage ? '✓ YES' : '✗ NO'}`)
      if (post.image_url) {
        console.log(`     Image URL: ${post.image_url}`)
      }
      if (metadata?.image_generation_enabled !== undefined) {
        console.log(`     Image Gen Enabled: ${metadata.image_generation_enabled}`)
      }
      console.log()
    })
  } else {
    console.log('  No recent posts')
  }
  console.log()
  
  // Check pipeline logs for image generation
  const { data: logs } = await supabase
    .from('pipeline_logs')
    .select('created_at, step, status, message, metadata')
    .eq('user_id', userId)
    .eq('step', 'generation')
    .order('created_at', { ascending: false })
    .limit(10)
  
  console.log('Recent Generation Logs:')
  if (logs && logs.length > 0) {
    logs.forEach((log, i) => {
      const icon = log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '⚠'
      console.log(`  ${i + 1}. ${icon} ${log.message}`)
      const metadata = log.metadata as any
      if (metadata?.imageUrl) {
        console.log(`     Image URL: ${metadata.imageUrl}`)
      }
      if (metadata?.hasImagePrompt !== undefined) {
        console.log(`     Has Image Prompt: ${metadata.hasImagePrompt}`)
      }
    })
  } else {
    console.log('  No generation logs')
  }
  console.log()
  
  // Summary
  console.log('=== Summary ===')
  console.log()
  
  if (!schedule.image_generation_enabled) {
    console.log('❌ Image generation is DISABLED in schedule_config')
    console.log('   Fix: UPDATE schedule_config SET image_generation_enabled = true')
  } else if (!schedule.image_times || schedule.image_times.length === 0) {
    console.log('❌ No image_times configured')
    console.log('   Fix: UPDATE schedule_config SET image_times = ARRAY[\'09:00\', \'18:00\']')
  } else if (!matchResult.matches) {
    console.log('⏰ Waiting for scheduled time')
    console.log(`   Next times: ${schedule.times?.join(', ')}`)
  } else if (matchResult.matches && !shouldGenImage) {
    console.log('✓ System working correctly - text-only post for this time')
  } else if (matchResult.matches && shouldGenImage) {
    console.log('✓ System should generate image NOW')
    console.log('   Trigger cron manually to test:')
    console.log('   curl -X POST https://YOUR-DOMAIN.vercel.app/api/cron/publish')
  }
  
  console.log()
  console.log('=== Test Complete ===')
}

testCronImageGeneration().catch(console.error)
