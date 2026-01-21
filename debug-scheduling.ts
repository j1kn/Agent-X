/**
 * Debug Script for Agent X Scheduling Issues
 * 
 * This script diagnoses why posts are not being published at scheduled times.
 * Run with: npx tsx debug-scheduling.ts
 */

import { createServiceClient } from './lib/supabase/server'
import { checkTimeMatch } from './lib/autopilot/workflow-helpers'

async function debugScheduling() {
  console.log('=== Agent X Scheduling Diagnostics ===\n')
  
  const supabase = createServiceClient()
  
  // Step 1: Check for users with autopilot enabled
  console.log('Step 1: Checking for autopilot users...')
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, autopilot_enabled, topics, tone')
    .eq('autopilot_enabled', true)
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }
  
  if (!users || users.length === 0) {
    console.log('❌ No users with autopilot enabled found')
    console.log('\n🔧 Fix: Enable autopilot in your user profile')
    return
  }
  
  console.log(`✓ Found ${users.length} user(s) with autopilot enabled\n`)
  
  // Step 2: Check each user's configuration
  for (const user of users) {
    console.log(`\n--- User: ${user.id} ---`)
    console.log(`Autopilot: ${user.autopilot_enabled ? '✓ ENABLED' : '✗ DISABLED'}`)
    console.log(`Topics: ${user.topics?.length || 0} configured`)
    console.log(`Tone: ${user.tone || 'not set'}`)
    
    // Check schedule configuration
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedule_config')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (scheduleError || !scheduleData) {
      console.log('❌ No schedule configuration found')
      console.log('🔧 Fix: Configure schedule in settings')
      continue
    }
    
    console.log('\nSchedule Configuration:')
    console.log(`  Days: ${scheduleData.days_of_week?.join(', ') || 'ALL DAYS'}`)
    console.log(`  Times: ${scheduleData.times?.join(', ') || 'NONE'}`)
    console.log(`  Timezone: ${scheduleData.timezone || 'UTC'}`)
    console.log(`  Image Generation: ${scheduleData.image_generation_enabled ? 'ENABLED' : 'DISABLED'}`)
    if (scheduleData.image_times) {
      console.log(`  Image Times: ${scheduleData.image_times.join(', ')}`)
    }
    
    if (!scheduleData.times || scheduleData.times.length === 0) {
      console.log('❌ No posting times configured')
      console.log('🔧 Fix: Add at least one posting time in schedule settings')
      continue
    }
    
    // Check current time match
    console.log('\nTime Match Check:')
    const matchResult = checkTimeMatch(scheduleData)
    console.log(`  Current Time (${scheduleData.timezone}): ${matchResult.currentTime}`)
    console.log(`  Time Slot: ${matchResult.timeSlot}`)
    console.log(`  Matches Schedule: ${matchResult.matches ? '✓ YES' : '✗ NO'}`)
    if (matchResult.matchedTime) {
      console.log(`  Matched Time: ${matchResult.matchedTime}`)
    }
    
    // Check for recent workflow runs
    const { data: recentRuns } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`\nRecent Workflow Runs: ${recentRuns?.length || 0}`)
    if (recentRuns && recentRuns.length > 0) {
      recentRuns.forEach((run, i) => {
        console.log(`  ${i + 1}. ${run.time_slot} - ${run.status} - ${run.platforms_published?.join(', ') || 'none'}`)
      })
    }
    
    // Check if already executed for current time slot
    if (matchResult.matches) {
      const { data: existingRun } = await supabase
        .from('workflow_runs')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .eq('time_slot', matchResult.timeSlot)
        .single()
      
      if (existingRun) {
        console.log(`\n⚠️  Already executed for time slot: ${matchResult.timeSlot}`)
        console.log(`   Status: ${existingRun.status}`)
        console.log(`   Executed at: ${existingRun.created_at}`)
        console.log('   This prevents duplicate posts (idempotency)')
      } else {
        console.log(`\n✓ No duplicate found - ready to post!`)
      }
    }
    
    // Check connected accounts
    const { data: accounts } = await supabase
      .from('connected_accounts')
      .select('platform, username, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    console.log(`\nConnected Accounts: ${accounts?.length || 0}`)
    if (accounts && accounts.length > 0) {
      accounts.forEach(acc => {
        console.log(`  ✓ ${acc.platform}: @${acc.username}`)
      })
    } else {
      console.log('  ❌ No active accounts connected')
      console.log('  🔧 Fix: Connect at least one platform (X or Telegram)')
    }
    
    // Check recent posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('created_at, status, platform, topic')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
    
    console.log(`\nRecent Posts: ${recentPosts?.length || 0}`)
    if (recentPosts && recentPosts.length > 0) {
      recentPosts.forEach((post, i) => {
        console.log(`  ${i + 1}. ${post.created_at} - ${post.platform} - ${post.status} - ${post.topic || 'no topic'}`)
      })
    }
    
    // Check pipeline logs
    const { data: logs } = await supabase
      .from('pipeline_logs')
      .select('created_at, step, status, message')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`\nRecent Pipeline Logs: ${logs?.length || 0}`)
    if (logs && logs.length > 0) {
      logs.forEach((log, i) => {
        const icon = log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '⚠'
        console.log(`  ${i + 1}. ${icon} ${log.step}: ${log.message}`)
      })
    }
  }
  
  // Step 3: Check Supabase cron jobs
  console.log('\n\n=== Supabase Cron Jobs ===')
  console.log('⚠️  Cron jobs require manual verification in Supabase')
  console.log('   Run this query in Supabase SQL Editor:')
  console.log('   SELECT jobid, jobname, schedule, active FROM cron.job;')
  console.log('   WHERE jobname IN (\'workflow-runner-cron\', \'publish-posts-cron\');')
  
  // Step 4: Summary and recommendations
  console.log('\n\n=== Summary & Recommendations ===\n')
  
  const issues: string[] = []
  const fixes: string[] = []
  
  if (!users || users.length === 0) {
    issues.push('No users have autopilot enabled')
    fixes.push('Enable autopilot in user settings')
  }
  
  for (const user of users || []) {
    const { data: schedule } = await supabase
      .from('schedule_config')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (!schedule) {
      issues.push(`User ${user.id}: No schedule configured`)
      fixes.push('Configure posting schedule in settings')
    } else if (!schedule.times || schedule.times.length === 0) {
      issues.push(`User ${user.id}: No posting times set`)
      fixes.push('Add at least one posting time')
    }
    
    const { data: accounts } = await supabase
      .from('connected_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    if (!accounts || accounts.length === 0) {
      issues.push(`User ${user.id}: No connected accounts`)
      fixes.push('Connect X or Telegram account')
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ All checks passed!')
    console.log('\nIf posts still not publishing:')
    console.log('1. Check Supabase cron jobs are running (see SUPABASE_CRON_SETUP.sql)')
    console.log('2. Verify YOUR-VERCEL-DOMAIN is set correctly in cron jobs')
    console.log('3. Check Vercel deployment logs for errors')
    console.log('4. Manually trigger: curl https://YOUR-DOMAIN.vercel.app/api/cron/publish')
  } else {
    console.log('❌ Issues Found:\n')
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`)
    })
    console.log('\n🔧 Fixes:\n')
    fixes.forEach((fix, i) => {
      console.log(`${i + 1}. ${fix}`)
    })
  }
  
  console.log('\n=== End of Diagnostics ===')
}

// Run diagnostics
debugScheduling().catch(console.error)
