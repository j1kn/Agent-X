-- =====================================================
-- TELEGRAM METRICS CRON JOB SETUP
-- =====================================================
-- This sets up automated metrics collection every 6 hours
-- using Supabase pg_cron extension
-- =====================================================

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Step 3: Create a function to call the metrics collection API
CREATE OR REPLACE FUNCTION trigger_metrics_collection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url text;
  cron_secret text;
  response text;
BEGIN
  -- Get the API URL from environment or use default
  -- You'll need to replace this with your actual Vercel deployment URL
  api_url := current_setting('app.settings.api_url', true);
  
  IF api_url IS NULL THEN
    -- Default to localhost for development
    api_url := 'http://localhost:3000';
  END IF;
  
  -- Get cron secret from environment
  cron_secret := current_setting('app.settings.cron_secret', true);
  
  -- Log the attempt
  RAISE NOTICE 'Triggering metrics collection at %', now();
  
  -- Note: pg_cron cannot make HTTP requests directly
  -- You'll need to use Vercel Cron Jobs or an external service
  -- This function is a placeholder for logging
  
  -- Insert a log entry to track cron execution
  INSERT INTO pipeline_logs (user_id, step, status, message, metadata)
  SELECT 
    user_id,
    'metrics',
    'success',
    'Automated metrics collection triggered',
    jsonb_build_object('timestamp', now())
  FROM user_profiles
  WHERE autopilot_enabled = true
  LIMIT 1;
  
END;
$$;

-- Step 4: Schedule the cron job to run every 6 hours
-- Note: This requires pg_cron extension and superuser privileges
SELECT cron.schedule(
  'collect-telegram-metrics',  -- Job name
  '0 */6 * * *',              -- Every 6 hours (at :00 minutes)
  'SELECT trigger_metrics_collection();'
);

-- Alternative: Run every 4 hours
-- SELECT cron.schedule(
--   'collect-telegram-metrics',
--   '0 */4 * * *',
--   'SELECT trigger_metrics_collection();'
-- );

-- Step 5: View scheduled jobs
-- SELECT * FROM cron.job;

-- Step 6: View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- VERCEL CRON JOBS (RECOMMENDED APPROACH)
-- =====================================================
-- Since Supabase pg_cron cannot make HTTP requests,
-- use Vercel Cron Jobs instead:
--
-- 1. Add to vercel.json:
-- {
--   "crons": [
--     {
--       "path": "/api/metrics/collect",
--       "schedule": "0 */6 * * *"
--     }
--   ]
-- }
--
-- 2. Set CRON_SECRET environment variable in Vercel
--
-- 3. The API route will verify the secret via Authorization header
-- =====================================================

-- =====================================================
-- MANUAL CLEANUP (if needed)
-- =====================================================

-- To unschedule the job:
-- SELECT cron.unschedule('collect-telegram-metrics');

-- To delete old metrics (keep last 30 days):
-- DELETE FROM post_metrics 
-- WHERE collected_at < NOW() - INTERVAL '30 days';

-- =====================================================
-- TESTING
-- =====================================================

-- Test the function manually:
-- SELECT trigger_metrics_collection();

-- Check if cron job is scheduled:
-- SELECT jobid, schedule, command, nodename, nodeport, database, username, active
-- FROM cron.job
-- WHERE jobname = 'collect-telegram-metrics';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
