-- Debug: Why Images Are Not Generating
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check schedule configuration for image generation
SELECT 
  user_id,
  image_generation_enabled,
  image_times,
  times as all_posting_times,
  timezone
FROM schedule_config
ORDER BY updated_at DESC;

-- 2. Check recent pipeline logs for image-related messages
SELECT 
  created_at,
  user_id,
  step,
  status,
  message,
  metadata
FROM pipeline_logs
WHERE message ILIKE '%image%'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check recent posts to see if image_url or image_data is populated
SELECT 
  created_at,
  user_id,
  platform,
  status,
  topic,
  image_url,
  CASE 
    WHEN image_data IS NOT NULL THEN 'Has image_data'
    ELSE 'No image_data'
  END as image_data_status,
  generation_metadata->>'image_generation_enabled' as img_gen_enabled,
  generation_metadata->>'has_image' as has_image,
  generation_metadata->>'image_prompt' as has_prompt
FROM posts
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if any posts have image prompts in metadata
SELECT 
  created_at,
  user_id,
  platform,
  LEFT(generation_metadata->>'image_prompt', 100) as image_prompt_preview,
  generation_metadata->>'image_generation_enabled' as enabled,
  image_url IS NOT NULL as has_url,
  image_data IS NOT NULL as has_data
FROM posts
WHERE generation_metadata->>'image_prompt' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Expected Results:
-- Query 1: Should show image_generation_enabled = true and image_times array populated
-- Query 2: Should show logs about image generation attempts
-- Query 3: Should show if images are being stored
-- Query 4: Should show if Claude is creating image prompts
