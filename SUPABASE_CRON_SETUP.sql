-- ============================================
-- Supabase Cron Setup for Post Publishing
-- ============================================
-- This works on ALL Vercel plans (including Hobby)
-- Replaces Vercel Cron which only works on Pro+
--
-- INSTRUCTIONS:
-- 1. Replace YOUR-VERCEL-DOMAIN with your actual Vercel domain
--    Example: agent-x-4fxz.vercel.app
-- 2. Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Step 2: Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Step 3: Remove existing cron job if it exists
SELECT cron.unschedule('publish-posts-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'publish-posts-cron'
);

-- Step 4: Create cron job to publish posts every 5 minutes
-- ⚠️ REPLACE YOUR-VERCEL-DOMAIN with your actual Vercel domain!
SELECT cron.schedule(
  'publish-posts-cron',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/cron/publish',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);

-- Step 5: Verify cron job was created
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'publish-posts-cron';

-- ============================================
-- To check cron job execution logs:
-- ============================================
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'publish-posts-cron')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- ============================================
-- To manually trigger (for testing):
-- ============================================
-- SELECT net.http_post(
--   url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/cron/publish',
--   headers := jsonb_build_object('Content-Type', 'application/json')
-- );

-- ============================================
-- To unschedule (if needed):
-- ============================================
-- SELECT cron.unschedule('publish-posts-cron');

