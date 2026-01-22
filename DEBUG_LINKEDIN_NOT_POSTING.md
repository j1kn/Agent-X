# Debug: LinkedIn Posts Not Generating

## Issue
LinkedIn posts are not being generated even though the integration is complete.

## Possible Causes (Ranked by Likelihood)

### 1. ⚠️ LinkedIn Account Not Connected (90% likely)
**Symptom**: No LinkedIn account in connected_accounts table  
**Check**: Run query #1 in `debug-linkedin-posting.sql`  
**Fix**: Connect LinkedIn account via `/accounts` page

### 2. ⚠️ Autopilot Not Running (80% likely)
**Symptom**: No recent workflow_runs entries  
**Check**: Run query #2 in `debug-linkedin-posting.sql`  
**Fix**: 
- Enable autopilot in settings
- Ensure schedule is configured
- Check Vercel cron is running

### 3. ⚠️ LinkedIn Rate Limit Hit (70% likely)
**Symptom**: LinkedIn posts in last 24 hours  
**Check**: Run query #4 in `debug-linkedin-posting.sql`  
**Fix**: Wait 24 hours or remove rate limit temporarily

### 4. ⚠️ Database Platform Enum Missing 'linkedin' (60% likely)
**Symptom**: Database errors when trying to insert LinkedIn posts  
**Check**: Run query #6 in `debug-linkedin-posting.sql`  
**Fix**: Add 'linkedin' to platform enum

---

## Step-by-Step Diagnosis

### Step 1: Verify LinkedIn Account is Connected

Run in Supabase SQL Editor:
```sql
SELECT 
  id,
  user_id,
  platform,
  platform_user_id,
  username,
  is_active,
  token_expires_at
FROM connected_accounts
WHERE platform = 'linkedin';
```

**Expected**: At least one row with `is_active = true`

**If Empty**:
1. Go to `/accounts` page
2. Click "Connect LinkedIn (Personal)"
3. Authorize the app
4. Verify connection appears in list

---

### Step 2: Check Database Platform Enum

Run in Supabase SQL Editor:
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'platform'
);
```

**Expected**: Should return:
- telegram
- x
- linkedin

**If 'linkedin' is Missing**, run this migration:
```sql
-- Add 'linkedin' to platform enum
ALTER TYPE platform ADD VALUE IF NOT EXISTS 'linkedin';
```

---

### Step 3: Check Recent Workflow Runs

Run in Supabase SQL Editor:
```sql
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
```

**Expected**: Recent entries with `platforms_published` containing 'linkedin'

**If No Recent Runs**:
- Check autopilot is enabled
- Verify schedule is configured
- Check Vercel cron logs

**If Runs Exist But No LinkedIn**:
- Check pipeline_logs for errors
- Verify LinkedIn account is active
- Check rate limiting

---

### Step 4: Check Pipeline Logs for LinkedIn

Run in Supabase SQL Editor:
```sql
SELECT 
  created_at,
  user_id,
  step,
  status,
  message,
  metadata
FROM pipeline_logs
WHERE message ILIKE '%linkedin%'
   OR metadata::text ILIKE '%linkedin%'
ORDER BY created_at DESC
LIMIT 20;
```

**Look for**:
- ✅ "Published to linkedin"
- ❌ "LinkedIn rate limit"
- ❌ "Failed to publish to linkedin"
- ❌ Any error messages

---

### Step 5: Test Manual LinkedIn Posting

Create a test file `test-linkedin-post.ts`:

```typescript
import { createServiceClient } from '@/lib/supabase/server'
import { publishToLinkedIn } from '@/lib/platforms/linkedin'

async function testLinkedInPost() {
  const supabase = createServiceClient()
  
  // Get LinkedIn account
  const { data: account } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('platform', 'linkedin')
    .eq('is_active', true)
    .single()
  
  if (!account) {
    console.error('No LinkedIn account found')
    return
  }
  
  console.log('LinkedIn account:', account.username)
  
  // Test post
  const result = await publishToLinkedIn({
    accessToken: account.access_token,
    platformUserId: account.platform_user_id,
    content: 'Test post from Agent X - LinkedIn integration test',
    tokenExpiresAt: account.token_expires_at,
  })
  
  console.log('Result:', result)
}

testLinkedInPost()
```

Run: `npx tsx test-linkedin-post.ts`

---

### Step 6: Check Vercel Deployment

1. Go to Vercel Dashboard
2. Click on your project
3. Go to Deployments
4. Click latest deployment
5. Check Functions tab
6. Look for `/api/workflows/run` logs

**Search for**:
- "Publishing to linkedin"
- "LinkedIn rate limit"
- Any LinkedIn-related errors

---

## Common Fixes

### Fix 1: Add 'linkedin' to Database Enum

If the platform enum doesn't include 'linkedin':

```sql
-- Run in Supabase SQL Editor
ALTER TYPE platform ADD VALUE IF NOT EXISTS 'linkedin';
```

Then redeploy your application.

---

### Fix 2: Connect LinkedIn Account

1. Go to `/accounts` page
2. Click "Connect LinkedIn (Personal)"
3. Authorize with LinkedIn
4. Verify "Personal Profile" appears in connected accounts

---

### Fix 3: Temporarily Disable Rate Limiting

In [`app/api/workflows/run/route.ts`](app/api/workflows/run/route.ts:296-313), comment out the rate limiting block:

```typescript
// LinkedIn rate limiting: Max 1 post per 24 hours
/*
if (platform === 'linkedin') {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentLinkedInPosts } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'linkedin')
    .eq('status', 'published')
    .gte('published_at', twentyFourHoursAgo)
    .limit(1)
  
  if (recentLinkedInPosts && recentLinkedInPosts.length > 0) {
    console.log(`[LinkedIn] Rate limit: Already posted to LinkedIn in last 24 hours. Skipping.`)
    await logPipeline(supabase, user.id, 'publishing', 'warning', 
      'LinkedIn rate limit: Max 1 post per 24 hours. Skipping LinkedIn.')
    continue
  }
}
*/
```

---

### Fix 4: Trigger Workflow Manually

Test the workflow endpoint directly:

```bash
curl -X POST https://your-domain.vercel.app/api/workflows/run
```

Or visit in browser:
```
https://your-domain.vercel.app/api/workflows/run
```

Check the response for LinkedIn-related messages.

---

## Verification Checklist

After applying fixes:

- [ ] LinkedIn account shows in connected_accounts table
- [ ] `platform` enum includes 'linkedin'
- [ ] Autopilot is enabled
- [ ] Schedule is configured with times
- [ ] Recent workflow_runs show LinkedIn in platforms_published
- [ ] Posts table has LinkedIn entries
- [ ] Vercel logs show "Publishing to linkedin"

---

## Expected Workflow Flow

When working correctly:

```
1. Cron triggers at scheduled time
   ↓
2. Workflow checks connected accounts
   ↓
3. Finds LinkedIn account (is_active = true)
   ↓
4. Checks LinkedIn rate limit (< 1 post in 24h)
   ↓
5. Claude generates content
   ↓
6. Creates platform variants (x, telegram, linkedin)
   ↓
7. Publishes to LinkedIn using publishToLinkedIn()
   ↓
8. Saves post to database with platform = 'linkedin'
   ↓
9. Post appears in /posts page
```

---

## Still Not Working?

If LinkedIn still isn't posting after all checks:

1. **Share the results** from:
   - Query #1 (connected accounts)
   - Query #2 (workflow runs)
   - Query #3 (pipeline logs)
   - Query #6 (platform enum)

2. **Check Vercel logs** for the exact error

3. **Try manual test** with `test-linkedin-post.ts`

This will help identify the exact point of failure.
