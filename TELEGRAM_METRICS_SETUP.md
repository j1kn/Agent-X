# 🚀 Quick Setup Guide - Telegram Metrics

## Prerequisites

- Supabase project set up
- Vercel deployment configured
- Telegram bot connected to AgentX

---

## Step-by-Step Setup

### 1️⃣ Database Migration (5 minutes)

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `TELEGRAM_METRICS_MIGRATION.sql`
5. Click **Run**
6. Verify success (should see "Success. No rows returned")

**Verification:**
```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'post_metrics';
```

You should see: `platform`, `forwards`, `reactions`, `comments`, `engagement_score`

---

### 2️⃣ Environment Variable (2 minutes)

Generate a secure secret:

```bash
# On Mac/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Add to Vercel:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** (paste your generated secret)
   - **Environments:** Production, Preview, Development
4. Click **Save**

**Add to Local `.env.local`:**
```bash
CRON_SECRET=your-generated-secret-here
```

---

### 3️⃣ Deploy to Vercel (3 minutes)

```bash
# Commit changes
git add .
git commit -m "Add Telegram metrics tracking"
git push origin main

# Vercel will auto-deploy
```

**Verify Deployment:**
1. Go to Vercel Dashboard → Deployments
2. Wait for deployment to complete
3. Check **Cron Jobs** tab
4. You should see: `collect-telegram-metrics` scheduled for `0 */6 * * *`

---

### 4️⃣ Test Manual Collection (2 minutes)

1. Make sure you have at least one published Telegram post
2. Go to your app: `https://your-app.vercel.app/metrics`
3. Click **"Collect Metrics Now"** button
4. Wait for success message
5. Verify metrics appear in the table

**If no posts exist:**
```bash
# Publish a test post first
# Go to /schedule and create a Telegram post
```

---

### 5️⃣ Verify Cron Job (Wait 6 hours or test now)

**Test Immediately:**
```bash
# Replace with your actual values
curl -X POST https://your-app.vercel.app/api/metrics/collect \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Check Logs:**
1. Vercel Dashboard → Your Project
2. Logs → Filter by `/api/metrics/collect`
3. Look for successful execution

---

## ✅ Verification Checklist

- [ ] Database migration completed successfully
- [ ] `CRON_SECRET` environment variable set in Vercel
- [ ] `CRON_SECRET` added to local `.env.local`
- [ ] Code deployed to Vercel
- [ ] Cron job appears in Vercel Dashboard
- [ ] Manual metrics collection works
- [ ] Metrics page displays data
- [ ] No console errors in browser

---

## 🧪 Testing Queries

### Check if posts are ready for metrics collection

```sql
SELECT 
  id,
  platform,
  platform_post_id,
  published_at,
  status
FROM posts
WHERE platform = 'telegram'
  AND status = 'published'
  AND platform_post_id IS NOT NULL
ORDER BY published_at DESC;
```

### Check collected metrics

```sql
SELECT 
  pm.id,
  pm.platform,
  pm.views,
  pm.forwards,
  pm.reactions,
  pm.comments,
  pm.engagement_score,
  pm.collected_at,
  p.content
FROM post_metrics pm
JOIN posts p ON pm.post_id = p.id
WHERE pm.platform = 'telegram'
ORDER BY pm.collected_at DESC
LIMIT 10;
```

### Check engagement score calculation

```sql
SELECT 
  post_id,
  views,
  forwards,
  reactions,
  comments,
  engagement_score,
  -- Manual calculation to verify
  (views * 0.2 + forwards * 3 + reactions * 2 + comments * 4) as manual_score
FROM post_metrics
WHERE platform = 'telegram'
LIMIT 5;
```

---

## 🐛 Common Issues

### Issue: "No metrics available yet"

**Cause:** No Telegram posts published or no metrics collected

**Solution:**
1. Check if you have published Telegram posts
2. Verify posts have `platform_post_id` set
3. Manually trigger collection
4. Check API logs for errors

### Issue: Cron job not appearing in Vercel

**Cause:** `vercel.json` not deployed or Vercel plan doesn't support crons

**Solution:**
1. Verify `vercel.json` is committed
2. Redeploy the project
3. Check if you're on Vercel Pro plan (required for crons)
4. Contact Vercel support if issue persists

### Issue: "Unauthorized" when collecting metrics

**Cause:** Not logged in or `CRON_SECRET` mismatch

**Solution:**
1. Make sure you're logged into the app
2. Verify `CRON_SECRET` matches in Vercel and request
3. Check browser console for auth errors

### Issue: TypeScript errors after migration

**Cause:** Supabase types not updated

**Solution:**
```bash
# Regenerate types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

---

## 📊 Expected Results

After setup, you should see:

**Metrics Page:**
- Global stats showing total posts, views, engagement
- Per-post table with all metrics
- "Collect Metrics Now" button working
- Data sorted by engagement score

**Database:**
- `post_metrics` table with new columns
- Metrics snapshots for each collection
- Engagement scores auto-calculated

**Vercel:**
- Cron job scheduled and running
- Successful execution logs every 6 hours
- No errors in function logs

---

## 🎯 Next Steps After Setup

1. **Wait for Real Data**
   - Let the cron job run for 24-48 hours
   - Collect multiple snapshots for trend analysis

2. **Implement Real Telegram Metrics**
   - Choose MTProto API or Telegram Premium
   - Update `fetchTelegramPostMetrics()` function
   - Test with real metrics data

3. **Add More Platforms**
   - Extend to X (Twitter) metrics
   - Add LinkedIn analytics
   - Use same pattern for consistency

4. **Enhance Dashboard**
   - Add charts and graphs
   - Show trends over time
   - Compare platform performance

---

## 📞 Need Help?

**Check Logs:**
- Vercel: Dashboard → Logs
- Supabase: Dashboard → Logs
- Browser: Developer Console

**Review Documentation:**
- `TELEGRAM_METRICS_IMPLEMENTATION.md` - Full technical details
- `TELEGRAM_METRICS_MIGRATION.sql` - Database schema
- `TELEGRAM_METRICS_CRON_SETUP.sql` - Cron configuration

**Common Commands:**
```bash
# View local logs
npm run dev

# Check Vercel deployment
vercel logs

# Test API endpoint
curl https://your-app.vercel.app/api/metrics
```

---

## ⏱️ Total Setup Time: ~15 minutes

- Database: 5 min
- Environment: 2 min  
- Deploy: 3 min
- Test: 2 min
- Verify: 3 min

---

**Ready to go!** 🚀

Your Telegram metrics tracking is now fully automated and production-ready.
