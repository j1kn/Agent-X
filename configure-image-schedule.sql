-- ============================================
-- Configure Image Generation Schedule
-- ============================================
-- This script helps you set up image generation
-- for specific time slots in your posting schedule.
--
-- INSTRUCTIONS:
-- 1. Replace YOUR_USER_ID with your actual user ID
-- 2. Customize the times and image_times arrays
-- 3. Run in Supabase SQL Editor
-- ============================================

-- Step 1: Check current configuration
SELECT 
  user_id,
  times,
  image_generation_enabled,
  image_times,
  timezone
FROM schedule_config
WHERE user_id = 'YOUR_USER_ID';

-- Step 2: Enable image generation and set image times
-- Example: Post at 09:00, 14:00, 18:00
--          Generate images only at 09:00 and 18:00
UPDATE schedule_config
SET 
  times = ARRAY['09:00', '14:00', '18:00'],
  image_generation_enabled = true,
  image_times = ARRAY['09:00', '18:00'],
  timezone = 'Europe/London',  -- Change to your timezone
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';

-- Step 3: Verify the update
SELECT 
  user_id,
  times,
  image_generation_enabled,
  image_times,
  timezone,
  updated_at
FROM schedule_config
WHERE user_id = 'YOUR_USER_ID';

-- ============================================
-- Expected Behavior After Configuration
-- ============================================
-- With the above configuration:
--
-- 09:00 → Post WITH image (in image_times array)
-- 14:00 → Post WITHOUT image (not in image_times array)
-- 18:00 → Post WITH image (in image_times array)
--
-- The cron job checks:
-- 1. Is current time in 'times' array? → Yes/No
-- 2. Is current time in 'image_times' array? → Yes/No
-- 3. If both Yes → Generate image
-- 4. If only first Yes → Text-only post
-- ============================================

-- ============================================
-- Troubleshooting Queries
-- ============================================

-- Check if autopilot is enabled
SELECT id, autopilot_enabled 
FROM user_profiles 
WHERE id = 'YOUR_USER_ID';

-- Check recent workflow runs
SELECT 
  time_slot,
  status,
  platforms_published,
  created_at
FROM workflow_runs
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Check recent posts with image status
SELECT 
  created_at,
  platform,
  status,
  image_url IS NOT NULL as has_image_url,
  image_data IS NOT NULL as has_image_data,
  (generation_metadata->>'image_generation_enabled')::boolean as image_gen_enabled,
  generation_metadata->>'has_image' as has_image
FROM posts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Check pipeline logs for image generation
SELECT 
  created_at,
  step,
  status,
  message,
  metadata->>'imageUrl' as image_url,
  metadata->>'hasImagePrompt' as has_image_prompt
FROM pipeline_logs
WHERE user_id = 'YOUR_USER_ID'
AND step = 'generation'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- Common Issues and Fixes
-- ============================================

-- Issue 1: image_generation_enabled is false
-- Fix:
-- UPDATE schedule_config 
-- SET image_generation_enabled = true 
-- WHERE user_id = 'YOUR_USER_ID';

-- Issue 2: image_times is NULL or empty
-- Fix:
-- UPDATE schedule_config 
-- SET image_times = ARRAY['09:00', '18:00'] 
-- WHERE user_id = 'YOUR_USER_ID';

-- Issue 3: times array doesn't include image_times
-- Fix: Make sure image_times are also in times array
-- UPDATE schedule_config 
-- SET 
--   times = ARRAY['09:00', '14:00', '18:00'],
--   image_times = ARRAY['09:00', '18:00']
-- WHERE user_id = 'YOUR_USER_ID';

-- Issue 4: Wrong timezone
-- Fix:
-- UPDATE schedule_config 
-- SET timezone = 'America/New_York'  -- or your timezone
-- WHERE user_id = 'YOUR_USER_ID';

-- ============================================
-- Test Configuration
-- ============================================

-- Get your user ID
SELECT id FROM auth.users LIMIT 1;

-- Check if STABILITY_API_KEY is configured (run in application logs)
-- Look for: "STABILITY_API_KEY not configured" errors

-- Manually trigger cron to test (use curl or Postman)
-- POST https://YOUR-DOMAIN.vercel.app/api/cron/publish

-- ============================================
-- Example Configurations
-- ============================================

-- Configuration 1: Images every morning
-- UPDATE schedule_config SET
--   times = ARRAY['07:00', '12:00', '17:00', '21:00'],
--   image_times = ARRAY['07:00']
-- WHERE user_id = 'YOUR_USER_ID';

-- Configuration 2: Images morning and evening
-- UPDATE schedule_config SET
--   times = ARRAY['09:00', '14:00', '18:00'],
--   image_times = ARRAY['09:00', '18:00']
-- WHERE user_id = 'YOUR_USER_ID';

-- Configuration 3: Images for all posts
-- UPDATE schedule_config SET
--   times = ARRAY['09:00', '14:00', '18:00'],
--   image_times = ARRAY['09:00', '14:00', '18:00']
-- WHERE user_id = 'YOUR_USER_ID';

-- Configuration 4: No images (text only)
-- UPDATE schedule_config SET
--   times = ARRAY['09:00', '14:00', '18:00'],
--   image_generation_enabled = false
-- WHERE user_id = 'YOUR_USER_ID';
