# Agent X Scheduling Troubleshooting Guide

## Problem: Posts Not Publishing at Scheduled Times

This guide helps diagnose and fix issues with automated post scheduling in Agent X.

---

## Quick Diagnosis

Run the diagnostic script to identify issues:

```bash
npx tsx debug-scheduling.ts
```

This will check:
- ✓ Autopilot enabled status
- ✓ Schedule configuration
- ✓ Time matching logic
- ✓ Connected accounts
- ✓ Recent workflow runs
- ✓ Pipeline logs

---

## Common Issues & Solutions

### 1. Autopilot Not Enabled

**Symptom:** No posts being generated automatically

**Check:**
```sql
SELECT id, autopilot_enabled FROM user_profiles;
```

**Fix:**
- Go to Settings → Enable Autopilot toggle
- Or run: `UPDATE user_profiles SET autopilot_enabled = true WHERE id = 'YOUR_USER_ID';`

---

### 2. No Schedule Configured

**Symptom:** Autopilot enabled but no posts generated

**Check:**
```sql
SELECT * FROM schedule_config WHERE user_id = 'YOUR_USER_ID';
```

**Fix:**
- Go to Schedule page
- Set posting times (e.g., 09:00, 14:00, 18:00)
- Set days of week (optional - leave empty for all days)
- Set timezone (e.g., Europe/London, America/New_York)
- Save configuration

---

### 3. Supabase Cron Jobs Not Configured

**Symptom:** Everything configured but cron never triggers

**Check:**
```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname IN ('workflow-runner-cron', 'publish-posts-cron');
```

**Expected Result:**
```
jobid | jobname                | schedule      | active
------|------------------------|---------------|-------
1     | workflow-runner-cron   | */5 * * * *   | true
2     | publish-posts-cron     | */5 * * * *   | true
```

**Fix:**
1. Open Supabase SQL Editor
2. Open [`SUPABASE_CRON_SETUP.sql`](SUPABASE_CRON_SETUP.sql)
3. Replace `YOUR-VERCEL-DOMAIN` with your actual Vercel domain (e.g., `agent-x-4fxz.vercel.app`)
4. Run the entire SQL script
5. Verify jobs created with the SELECT query above

---

### 4. Wrong Vercel Domain in Cron Jobs

**Symptom:** Cron jobs exist but fail to trigger

**Check Cron Logs:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('workflow-runner-cron', 'publish-posts-cron'))
ORDER BY start_time DESC 
LIMIT 10;
```

**Look for:** HTTP errors, 404s, connection failures

**Fix:**
1. Get your Vercel domain from Vercel dashboard
2. Update cron jobs with correct domain:

```sql
-- Remove old jobs
SELECT cron.unschedule('workflow-runner-cron');
SELECT cron.unschedule('publish-posts-cron');

-- Create new jobs with correct domain
SELECT cron.schedule(
  'workflow-runner-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-ACTUAL-DOMAIN.vercel.app/api/workflows/run',
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'publish-posts-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-ACTUAL-DOMAIN.vercel.app/api/cron/publish',
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) AS request_id;
  $$
);
```

---

### 5. No Connected Accounts

**Symptom:** Workflow runs but no posts published

**Check:**
```sql
SELECT platform, username, is_active 
FROM connected_accounts 
WHERE user_id = 'YOUR_USER_ID';
```

**Fix:**
- Go to Accounts page
- Connect at least one platform (X or Telegram)
- Ensure account shows as "Active"

---

### 6. Time Zone Mismatch

**Symptom:** Posts publish at wrong times

**Check:**
```sql
SELECT timezone, times FROM schedule_config WHERE user_id = 'YOUR_USER_ID';
```

**Fix:**
- Verify timezone matches your location
- Use IANA timezone format (e.g., `Europe/London`, `America/New_York`, `Asia/Tokyo`)
- Update if incorrect:
```sql
UPDATE schedule_config 
SET timezone = 'YOUR_CORRECT_TIMEZONE' 
WHERE user_id = 'YOUR_USER_ID';
```

---

### 7. Duplicate Prevention (Idempotency)

**Symptom:** Post generated once but not again at same time

**Explanation:** This is **intentional behavior**. The system prevents duplicate posts for the same time slot using the `workflow_runs` table.

**Check:**
```sql
SELECT time_slot, status, created_at, platforms_published 
FROM workflow_runs 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected:** One entry per time slot (e.g., `2026-01-21 09:00`)

**To Reset (for testing):**
```sql
-- Delete workflow runs to allow re-execution
DELETE FROM workflow_runs 
WHERE user_id = 'YOUR_USER_ID' 
AND time_slot = '2026-01-21 09:00';
```

---

### 8. Time Window Logic

**How It Works:**
- Cron runs every 5 minutes
- Checks if current time is within 0-4 minutes **after** scheduled time
- Example: If scheduled for 09:00, will trigger between 09:00-09:04

**Check Current Time Match:**
```typescript
// Run debug-scheduling.ts to see:
// Current Time: 09:02
// Scheduled Times: 09:00, 14:00, 18:00
// Matches Schedule: YES (matched 09:00)
```

**Fix:**
- Ensure current time is within 5-minute window of scheduled time
- Wait for next scheduled time slot
- Or manually trigger for testing

---

## Manual Testing

### Test Cron Endpoint Directly

```bash
# Test publish endpoint
curl -X POST https://YOUR-DOMAIN.vercel.app/api/cron/publish

# Test workflow endpoint
curl -X POST https://YOUR-DOMAIN.vercel.app/api/workflows/run
```

### Test from Supabase

```sql
-- Trigger workflow runner
SELECT net.http_post(
  url := 'https://YOUR-DOMAIN.vercel.app/api/workflows/run',
  headers := jsonb_build_object('Content-Type', 'application/json')
);

-- Trigger publish cron
SELECT net.http_post(
  url := 'https://YOUR-DOMAIN.vercel.app/api/cron/publish',
  headers := jsonb_build_object('Content-Type', 'application/json')
);
```

---

## Monitoring & Logs

### Check Pipeline Logs

```sql
SELECT created_at, step, status, message, metadata
FROM pipeline_logs
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

**Look for:**
- ✓ `planning` → Topic selection
- ✓ `generation` → Content generation
- ✓ `publishing` → Platform publishing
- ✗ Any `error` status

### Check Workflow Runs

```sql
SELECT time_slot, status, platforms_published, created_at
FROM workflow_runs
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Recent Posts

```sql
SELECT created_at, platform, status, topic, content
FROM posts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step-by-Step Verification Checklist

- [ ] **Step 1:** Autopilot enabled in user profile
- [ ] **Step 2:** Schedule configured with times and timezone
- [ ] **Step 3:** At least one platform account connected
- [ ] **Step 4:** Topics configured in user profile
- [ ] **Step 5:** Supabase cron jobs created
- [ ] **Step 6:** Correct Vercel domain in cron jobs
- [ ] **Step 7:** Cron jobs are active (not paused)
- [ ] **Step 8:** Current time matches scheduled time (within 5-min window)
- [ ] **Step 9:** No duplicate workflow_run for current time slot
- [ ] **Step 10:** API keys configured (ANTHROPIC_API_KEY, etc.)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Supabase Cron (Every 5 minutes)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────────────────────┐
                            │                                 │
                            ▼                                 ▼
              ┌──────────────────────┐        ┌──────────────────────┐
              │ /api/workflows/run   │        │ /api/cron/publish    │
              │ (Primary)            │        │ (Fallback)           │
              └──────────────────────┘        └──────────────────────┘
                            │                                 │
                            ▼                                 ▼
              ┌──────────────────────────────────────────────────────┐
              │ 1. Check autopilot_enabled = true                    │
              │ 2. Check schedule matches current time               │
              │ 3. Check no duplicate in workflow_runs               │
              │ 4. Select topic (avoid recent topics)                │
              │ 5. Generate content with Claude                      │
              │ 6. Generate image (if enabled for time slot)         │
              │ 7. Publish to connected platforms                    │
              │ 8. Record workflow_run (prevent duplicates)          │
              └──────────────────────────────────────────────────────┘
```

---

## Environment Variables

Ensure these are set in Vercel:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ANTHROPIC_API_KEY=sk-ant-xxx...

# Optional (for image generation)
STABILITY_API_KEY=sk-xxx...

# Platform APIs
X_API_KEY=xxx
X_API_SECRET=xxx
TELEGRAM_BOT_TOKEN=xxx
```

---

## Getting Help

If issues persist after following this guide:

1. Run diagnostic script: `npx tsx debug-scheduling.ts`
2. Check Vercel deployment logs
3. Check Supabase cron job logs
4. Review pipeline_logs table for errors
5. Manually trigger endpoint to test

---

## Related Files

- [`SUPABASE_CRON_SETUP.sql`](SUPABASE_CRON_SETUP.sql) - Cron job setup
- [`app/api/cron/publish/route.ts`](app/api/cron/publish/route.ts) - Publish endpoint
- [`app/api/workflows/run/route.ts`](app/api/workflows/run/route.ts) - Workflow endpoint
- [`lib/autopilot/workflow-helpers.ts`](lib/autopilot/workflow-helpers.ts) - Time matching logic
- [`debug-scheduling.ts`](debug-scheduling.ts) - Diagnostic script
