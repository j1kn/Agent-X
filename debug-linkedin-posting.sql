-- Debug LinkedIn Posting Issue
-- Run this in Supabase SQL Editor to diagnose why LinkedIn posts aren't generating

-- 1. Check if LinkedIn account is connected
SELECT 
  id,
  user_id,
  platform,
  platform_user_id,
  username,
  is_active,
  token_expires_at,
  created_at
FROM connected_accounts
WHERE platform = 'linkedin'
ORDER BY created_at DESC;

-- 2. Check recent workflow runs
SELECT 
  id,
  user_id,
  time_slot,
  status,
  platforms_published,
  created_at
FROM workflow_runs
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check recent pipeline logs for LinkedIn mentions
SELECT 
  created_at,
  user_id,
  step,
  status,
  message,
  metadata
FROM pipeline_logs
WHERE message ILIKE '%linkedin%'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check if any LinkedIn posts exist
SELECT 
  id,
  user_id,
  platform,
  status,
  content,
  published_at,
  created_at
FROM posts
WHERE platform = 'linkedin'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check all recent posts to see what platforms are being used
SELECT 
  platform,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_post
FROM posts
GROUP BY platform, status
ORDER BY last_post DESC;

-- 6. Check if 'linkedin' is in the platform enum
SELECT 
  enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'platform'
);

-- 7. Check schedule configuration
SELECT 
  user_id,
  days_of_week,
  times,
  timezone,
  image_generation_enabled,
  image_times
FROM schedule_config
ORDER BY updated_at DESC;

-- 8. Check autopilot status
SELECT 
  id,
  autopilot_enabled,
  topics,
  tone
FROM user_profiles
ORDER BY updated_at DESC;
