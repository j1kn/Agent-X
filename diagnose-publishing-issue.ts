/**
 * Diagnose Publishing Issue
 * 
 * This script checks why scheduled posts are not being published
 * at their scheduled time.
 * 
 * Run with: npx tsx diagnose-publishing-issue.ts
 */

import { createServiceClient } from './lib/supabase/server'

async function diagnosePublishing() {
  console.log('=== Diagnosing Publishing Issue ===\n')
  
  const supabase = createServiceClient()
  
  // Step 1: Check for scheduled posts
  const { data: scheduledPosts } = await supabase
    .from('posts')
    .select('id, created_at, scheduled_for, status, platform, content')
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true })
  
  console.log('Step 1: Scheduled Posts')
  console.log(`Found ${scheduledPosts?.length || 0} posts with status='scheduled'\n`)
  
  if (scheduledPosts && scheduledPosts.length > 0) {
    const now = new Date()
    scheduledPosts.forEach((post, i) => {
      const scheduledTime = new Date(post.scheduled_for || new Date())
      const isPast = scheduledTime <= now
      const diff = Math.abs(now.getTime() - scheduledTime.getTime()) / 1000 / 60 // minutes
      
      console.log(`${i + 1}. Post ID: ${post.id}`)
      console.log(`   Platform: ${post.platform}`)
      console.log(`   Scheduled: ${post.scheduled_for}`)
      console.log(`   Status: ${isPast ? '⚠️ OVERDUE' : '⏰ FUTURE'} (${diff.toFixed(0)} min ${isPast ? 'ago' : 'from now'})`)
      console.log(`   Content: ${post.content.substring(0, 50)}...`)
      console.log()
    })
  } else {
    console.log('✓ No scheduled posts found (this is normal if all posts have been published)\n')
  }
  
  // Step 2: Check for posts that should have been published
  const { data: overduePosts } = await supabase
    .from('posts')
    .select('id, scheduled_for, status, platform')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
  
  console.log('Step 2: Overdue Posts (should be publishing)')
  if (overduePosts && overduePosts.length > 0) {
    console.log(`❌ Found ${overduePosts.length} posts that should have been published!`)
    console.log('These posts are past their scheduled time but still have status="scheduled"\n')
    overduePosts.forEach((post, i) => {
      console.log(`${i + 1}. ${post.platform} - ${post.scheduled_for} (ID: ${post.id})`)
    })
    console.log()
  } else {
    console.log('✓ No overdue posts\n')
  }
  
  // Step 3: Check recent published posts
  const { data: publishedPosts } = await supabase
    .from('posts')
    .select('id, scheduled_for, published_at, status, platform')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5)
  
  console.log('Step 3: Recently Published Posts')
  if (publishedPosts && publishedPosts.length > 0) {
    console.log(`✓ Found ${publishedPosts.length} recently published posts\n`)
    publishedPosts.forEach((post, i) => {
      console.log(`${i + 1}. ${post.platform} - Published: ${post.published_at}`)
    })
    console.log()
  } else {
    console.log('❌ No published posts found - this suggests publishing is not working\n')
  }
  
  // Step 4: Check publishing logs
  const { data: publishLogs } = await supabase
    .from('pipeline_logs')
    .select('created_at, status, message, metadata')
    .eq('step', 'publishing')
    .order('created_at', { ascending: false })
    .limit(10)
  
  console.log('Step 4: Recent Publishing Logs')
  if (publishLogs && publishLogs.length > 0) {
    console.log(`Found ${publishLogs.length} publishing log entries\n`)
    publishLogs.forEach((log, i) => {
      const icon = log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '⚠'
      console.log(`${i + 1}. ${icon} ${log.message}`)
      console.log(`   Time: ${log.created_at}`)
    })
    console.log()
  } else {
    console.log('❌ No publishing logs found - publisher has never run\n')
  }
  
  // Step 5: Check connected accounts
  const { data: accounts } = await supabase
    .from('connected_accounts')
    .select('platform, username, is_active')
    .eq('is_active', true)
  
  console.log('Step 5: Connected Accounts')
  if (accounts && accounts.length > 0) {
    console.log(`✓ Found ${accounts.length} active account(s)\n`)
    accounts.forEach((acc, i) => {
      console.log(`${i + 1}. ${acc.platform}: @${acc.username}`)
    })
    console.log()
  } else {
    console.log('❌ No active accounts - posts cannot be published\n')
  }
  
  // Step 6: Check failed posts
  const { data: failedPosts } = await supabase
    .from('posts')
    .select('id, created_at, platform, status')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log('Step 6: Failed Posts')
  if (failedPosts && failedPosts.length > 0) {
    console.log(`⚠️  Found ${failedPosts.length} failed posts\n`)
    failedPosts.forEach((post, i) => {
      console.log(`${i + 1}. ${post.platform} - ${post.created_at}`)
    })
    console.log()
  } else {
    console.log('✓ No failed posts\n')
  }
  
  // Diagnosis Summary
  console.log('=== DIAGNOSIS ===\n')
  
  const hasOverdue = overduePosts && overduePosts.length > 0
  const hasPublished = publishedPosts && publishedPosts.length > 0
  const hasLogs = publishLogs && publishLogs.length > 0
  const hasAccounts = accounts && accounts.length > 0
  
  if (hasOverdue && !hasPublished && !hasLogs) {
    console.log('❌ ISSUE IDENTIFIED: Cron job is NOT running')
    console.log('\nThe publisher has never executed. Posts are scheduled but not being published.')
    console.log('\nPossible causes:')
    console.log('1. Supabase cron jobs not configured')
    console.log('2. Wrong Vercel domain in cron job URL')
    console.log('3. Cron job is paused/disabled')
    console.log('\nFixes:')
    console.log('1. Run SUPABASE_CRON_SETUP.sql in Supabase SQL Editor')
    console.log('2. Replace YOUR-VERCEL-DOMAIN with actual domain')
    console.log('3. Verify cron jobs: SELECT * FROM cron.job;')
    console.log('4. Check cron logs: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;')
  } else if (hasOverdue && hasPublished && hasLogs) {
    console.log('⚠️  ISSUE IDENTIFIED: Cron job running but not picking up all posts')
    console.log('\nSome posts are being published, but others are stuck.')
    console.log('\nPossible causes:')
    console.log('1. Cron job timing issue (runs every 5 min, posts might be scheduled between runs)')
    console.log('2. Publisher encountering errors for specific posts')
    console.log('3. Platform API issues')
    console.log('\nFixes:')
    console.log('1. Check pipeline_logs for error messages')
    console.log('2. Manually trigger: curl -X POST https://YOUR-DOMAIN.vercel.app/api/cron/publish')
    console.log('3. Check platform API credentials')
  } else if (!hasAccounts) {
    console.log('❌ ISSUE IDENTIFIED: No connected accounts')
    console.log('\nYou need to connect at least one social media account.')
    console.log('\nFix: Go to Accounts page and connect X or Telegram')
  } else if (!hasOverdue && !hasPublished) {
    console.log('✓ No issues detected')
    console.log('\nEither:')
    console.log('- No posts have been scheduled yet')
    console.log('- All scheduled posts are for future times')
    console.log('- System is working correctly')
  } else {
    console.log('✓ System appears to be working')
    console.log('\nPosts are being published successfully.')
  }
  
  console.log('\n=== End of Diagnosis ===')
}

diagnosePublishing().catch(console.error)
