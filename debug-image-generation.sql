-- Debug Script for Image Generation Issues
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- 1. Check if migration columns exist
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
  AND column_name IN ('image_url', 'image_data')
ORDER BY column_name;

-- Expected: Should return 2 rows (image_url and image_data)
-- If empty: Migration not run yet

-- 2. Check if user has Gemini API key configured
SELECT 
    id,
    gemini_api_key IS NOT NULL as has_gemini_key,
    CASE 
        WHEN gemini_api_key IS NOT NULL THEN LEFT(gemini_api_key, 10) || '...'
        ELSE 'NOT SET'
    END as key_preview
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Expected: has_gemini_key should be TRUE
-- If FALSE: User hasn't configured Gemini API key in Settings

-- 3. Check schedule configuration
SELECT 
    user_id,
    image_generation_enabled,
    image_times,
    times as all_posting_times,
    days_of_week,
    timezone
FROM schedule_config
ORDER BY updated_at DESC
LIMIT 5;

-- Expected: 
-- - image_generation_enabled should be TRUE
-- - image_times should have at least one time like ['09:00']
-- If NULL or FALSE: User hasn't enabled image generation in Schedule

-- 4. Check recent posts for image data
SELECT 
    id,
    user_id,
    platform,
    created_at,
    image_url IS NOT NULL as has_image_url,
    image_data IS NOT NULL as has_image_data,
    generation_metadata->>'image_prompt' as image_prompt_preview,
    generation_metadata->>'image_generation_enabled' as was_image_enabled,
    generation_metadata->>'has_image' as metadata_has_image,
    LEFT(content, 50) || '...' as content_preview
FROM posts
ORDER BY created_at DESC
LIMIT 10;

-- Expected: 
-- - has_image_data should be TRUE for posts at scheduled image times
-- - image_prompt_preview should show the generated prompt
-- If all FALSE: Image generation is not working

-- 5. Check pipeline logs for image generation
SELECT 
    user_id,
    step,
    status,
    message,
    metadata,
    created_at
FROM pipeline_logs
WHERE message ILIKE '%image%'
   OR metadata::text ILIKE '%image%'
ORDER BY created_at DESC
LIMIT 20;

-- Expected: Should see logs like:
-- - "Image generated successfully"
-- - "Image generation REQUIRED"
-- - "Image prompt created"
-- If empty or errors: Check the error messages

-- 6. Check workflow runs
SELECT 
    user_id,
    time_slot,
    status,
    platforms_published,
    created_at
FROM workflow_runs
ORDER BY created_at DESC
LIMIT 10;

-- Shows recent workflow executions

-- 7. Check for any errors in pipeline logs
SELECT 
    user_id,
    step,
    status,
    message,
    created_at
FROM pipeline_logs
WHERE status = 'error'
   OR status = 'warning'
ORDER BY created_at DESC
LIMIT 20;

-- Shows any errors or warnings that might explain the issue
