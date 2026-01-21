-- ============================================
-- Check Scheduled Posts Status
-- ============================================
-- This script helps you see what posts are scheduled
-- and why they might not be publishing
--
-- Run in Supabase SQL Editor
-- ============================================

-- Step 1: Check all recent posts and their status
SELECT 
  id,
  created_at,
  status,
  platform,
  scheduled_for,
  published_at,
  image_url IS NOT NULL as has_image,
  CASE 
    WHEN status = 'scheduled' AND scheduled_for <= NOW() THEN '⚠️ READY TO PUBLISH'
    WHEN status = 'scheduled' AND scheduled_for > NOW() THEN '⏰ SCHEDULED FOR FUTURE'
    WHEN status = 'published' THEN '✅ PUBLISHED'
    WHEN status = 'failed' THEN '❌ FAILED'
    ELSE status
  END as post_status
FROM posts
ORDER BY created_at DESC
LIMIT 20;

-- Step 2: Check posts that should be publishing NOW
SELECT 
  id,
  created_at,
  status,
  platform,
  scheduled_for,
  NOW() as current_time,
  (NOW() - scheduled_for) as time_overdue
FROM posts
WHERE status = 'scheduled'
AND scheduled_for <= NOW()
ORDER BY scheduled_for ASC;

-- Step 3: Check posts scheduled for the future
SELECT 
  id,
  created_at,
  status,
  platform,
  scheduled_for,
  NOW() as current_time,
  (scheduled_for - NOW()) as time_until_publish
FROM posts
WHERE status = 'scheduled'
AND scheduled_for > NOW()
ORDER BY scheduled_for ASC
LIMIT 10;

-- Step 4: Check recent pipeline logs for publishing
SELECT 
  created_at,
  step,
  status,
  message
FROM pipeline_logs
WHERE step = 'publishing'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- Common Issues and Fixes
-- ============================================

-- Issue 1: Posts are scheduled for future time
-- This is EXPECTED behavior when using "Generate Post" button
-- Posts are scheduled based on your schedule_config
-- They will be published when the cron job runs

-- Issue 2: Posts are overdue but not publishing
-- Check if cron job is running:
-- SELECT * FROM cron.job WHERE jobname = 'publish-posts-cron';

-- Issue 3: Want immediate publishing instead of scheduling
-- Option A: Manually update post to publish now
-- UPDATE posts 
-- SET scheduled_for = NOW() 
-- WHERE id = 'POST_ID' AND status = 'scheduled';

-- Option B: Manually trigger publisher
-- Call: POST https://YOUR-DOMAIN.vercel.app/api/cron/publish

-- ============================================
-- Understanding the Flow
-- ============================================

-- When you click "Generate Post" or "Generate Post with Image":
-- 1. Post is created with status = 'scheduled'
-- 2. scheduled_for is set to next optimal time (from schedule_config)
-- 3. Post waits in database
-- 4. Cron job runs every 5 minutes
-- 5. Cron calls publishScheduledPosts()
-- 6. Publisher finds posts where scheduled_for <= NOW()
-- 7. Publisher publishes to platform
-- 8. Status updated to 'published'

-- ============================================
-- Force Publish All Scheduled Posts NOW
-- ============================================

-- WARNING: This will attempt to publish ALL scheduled posts immediately
-- UPDATE posts 
-- SET scheduled_for = NOW() 
-- WHERE status = 'scheduled';

-- Then manually trigger the publisher:
-- POST https://YOUR-DOMAIN.vercel.app/api/cron/publish
