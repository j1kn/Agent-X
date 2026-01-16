-- ============================================
-- Supabase Cron Setup for Agent X
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

-- ============================================
-- CRON JOB 1: Workflow Runner (AUTOPILOT)
-- ============================================
-- Runs every 5 minutes to check schedules and
-- generate + publish posts immediately.
-- This is the main autopilot engine for scheduled auto-generation.
-- Only processes users with autopilot_enabled = true.

-- Remove existing cron job if it exists
SELECT cron.unschedule('workflow-runner-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'workflow-runner-cron'
);

-- Create workflow runner cron job
-- ⚠️ REPLACE YOUR-VERCEL-DOMAIN with your actual Vercel domain!
SELECT cron.schedule(
  'workflow-runner-cron',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/workflows/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);

-- ============================================
-- CRON JOB 2: Scheduled Post Publisher (ENHANCED)
-- ============================================
-- Phase 1: Publishes posts that were manually scheduled for a future time
-- Phase 2: If no scheduled posts exist, auto-generates content for autopilot users
--
-- This provides a fallback auto-generation mechanism that works alongside
-- the workflow runner. Runs every 5 minutes.
--
-- NEW BEHAVIOR (as of 2026-01-16):
-- - First publishes any scheduled posts (existing functionality)
-- - If NO scheduled posts found, checks for autopilot users
-- - Auto-generates and publishes content when schedule matches
-- - Prevents duplicates via workflow_runs table
-- - Respects autopilot_enabled flag and user schedules

-- Remove existing cron job if it exists
SELECT cron.unschedule('publish-posts-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'publish-posts-cron'
);

-- Create cron job to publish scheduled posts
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

-- ============================================
-- Verify cron jobs were created
-- ============================================
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname IN ('workflow-runner-cron', 'publish-posts-cron');

-- ============================================
-- To check cron job execution logs:
-- ============================================
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('workflow-runner-cron', 'publish-posts-cron'))
-- ORDER BY start_time DESC 
-- LIMIT 20;

-- ============================================
-- To manually trigger workflow runner (for testing):
-- ============================================
-- SELECT net.http_post(
--   url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/workflows/run',
--   headers := jsonb_build_object('Content-Type', 'application/json')
-- );

-- ============================================
-- To manually trigger publish cron (for testing):
-- ============================================
-- SELECT net.http_post(
--   url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/cron/publish',
--   headers := jsonb_build_object('Content-Type', 'application/json')
-- );

-- ============================================
-- To unschedule (if needed):
-- ============================================
-- SELECT cron.unschedule('workflow-runner-cron');
-- SELECT cron.unschedule('publish-posts-cron');

