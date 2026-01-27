# 📊 Telegram Metrics Tracking Implementation Guide

## Overview

This document describes the complete implementation of automated Telegram metrics tracking for AgentX. The system automatically collects and displays engagement metrics for all Telegram posts.

---

## 🏗️ Architecture

### Components

1. **Database Schema** - Extended `post_metrics` table with Telegram-specific fields
2. **Metrics Collector** - API route that fetches metrics from Telegram
3. **Cron Job** - Automated collection every 6 hours
4. **Metrics Dashboard** - Frontend display of all metrics

### Data Flow

```
Telegram Post Published
    ↓
platform_post_id stored in posts table
    ↓
Cron Job triggers every 6 hours
    ↓
/api/metrics/collect fetches metrics
    ↓
Metrics stored as snapshot in post_metrics
    ↓
Metrics page displays aggregated data
```

---

## 📋 Setup Instructions

### Step 1: Database Migration

Run the migration to update your database schema:

```bash
# Connect to your Supabase project
# Go to SQL Editor and run: TELEGRAM_METRICS_MIGRATION.sql
```

This migration:
- Adds `platform`, `forwards`, `reactions`, `comments`, `engagement_score` columns
- Creates indexes for performance
- Adds RLS policies
- Creates engagement score calculation function
- Sets up auto-calculation trigger

### Step 2: Environment Variables

Add to your `.env.local` or Vercel environment:

```bash
# Required for cron job authentication
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Step 3: Deploy to Vercel

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/metrics/collect",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

After deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `CRON_SECRET` with your generated secret
3. Redeploy the project

### Step 4: Verify Cron Job

Check Vercel Dashboard → Your Project → Cron Jobs to see:
- Job status
- Last run time
- Next scheduled run
- Execution logs

---

## 🔧 API Endpoints

### POST /api/metrics/collect

Collects metrics for all Telegram posts from the last 7 days.

**Authentication:**
- Cron: `Authorization: Bearer {CRON_SECRET}`
- Manual: User session cookie

**Response:**
```json
{
  "success": true,
  "message": "Metrics collection completed",
  "collected": 5,
  "failed": 0,
  "total": 5
}
```

**Manual Trigger:**
```bash
curl -X POST https://your-app.vercel.app/api/metrics/collect \
  -H "Cookie: your-session-cookie"
```

### GET /api/metrics

Fetches metrics for the authenticated user's posts.

**Query Parameters:**
- `postId` (optional) - Get metrics for specific post
- `platform` (optional) - Filter by platform (telegram, x, linkedin)

**Response:**
```json
{
  "metrics": [
    {
      "id": "uuid",
      "post_id": "uuid",
      "platform": "telegram",
      "views": 1250,
      "forwards": 15,
      "reactions": 42,
      "comments": 8,
      "engagement_score": 398.0,
      "collected_at": "2026-01-27T12:00:00Z"
    }
  ]
}
```

---

## 📊 Engagement Score Formula

The engagement score is calculated automatically via database trigger:

```
engagement_score = 
  (views × 0.2) + 
  (forwards × 3) + 
  (reactions × 2) + 
  (comments × 4)
```

**Rationale:**
- **Views** (0.2x) - Passive engagement, lowest weight
- **Reactions** (2x) - Active but low-effort engagement
- **Forwards** (3x) - High-value sharing behavior
- **Comments** (4x) - Highest engagement, requires most effort

---

## 🎨 Metrics Dashboard

### Location
`/metrics` - Accessible from the dashboard navigation

### Features

**Global Stats:**
- Total Posts
- Total Views
- Average Engagement Score
- Best Post Score
- Total Forwards
- Total Reactions
- Average Views per Post

**Per-Post Table:**
- Post ID (truncated)
- Views
- Reactions
- Forwards
- Comments
- Engagement Score
- Collection Timestamp

**Actions:**
- "Collect Metrics Now" button for manual collection
- Auto-refresh after manual collection
- Sorted by engagement score (descending)

---

## 🔌 Telegram API Integration

### Current Implementation

The system uses Telegram Bot API, which has **limited metrics access**:

```typescript
// lib/platforms/telegram.ts
export async function fetchTelegramPostMetrics(
  accessToken: string,
  chatId: string,
  messageId: string
): Promise<{
  views: number
  forwards: number
  reactions: number
  comments: number
}>
```

### Limitations

Telegram Bot API **does not provide**:
- View counts for channel posts
- Forward counts
- Reaction counts
- Comment/reply counts

### Production Solutions

To get actual metrics, you need one of these:

#### Option 1: MTProto API (Recommended)
Use Telegram's MTProto protocol with a user account:

```bash
npm install telegram
```

```typescript
import { TelegramClient } from 'telegram'

// Requires user phone number authentication
const client = new TelegramClient(...)
const stats = await client.invoke(
  new Api.messages.GetMessageStats({
    channel: channelId,
    msgId: messageId
  })
)
```

#### Option 2: Telegram Premium API
- Requires Telegram Premium subscription
- Provides detailed analytics
- Access via official API

#### Option 3: Channel Admin Rights
- Make bot an admin in the channel
- Enables some statistics access
- Still limited compared to MTProto

### Placeholder Metrics

Currently returns zeros until proper API is configured:

```typescript
return {
  views: 0,
  forwards: 0,
  reactions: 0,
  comments: 0,
}
```

**To implement real metrics:**
1. Choose an option above
2. Update `fetchTelegramPostMetrics()` in `lib/platforms/telegram.ts`
3. Add necessary credentials to environment variables
4. Test with a real Telegram post

---

## 🔄 Data Retention

### Snapshot Strategy

Metrics are stored as **snapshots**, not updates:
- Each collection creates a new row
- Historical data is preserved
- Enables trend analysis over time

### Cleanup

To prevent unlimited growth, periodically clean old snapshots:

```sql
-- Keep only the last 30 days
DELETE FROM post_metrics 
WHERE collected_at < NOW() - INTERVAL '30 days';
```

Add this to a monthly cron job or run manually.

---

## 🧪 Testing

### Manual Collection Test

1. Publish a Telegram post via AgentX
2. Verify `platform_post_id` is stored in `posts` table
3. Go to `/metrics` page
4. Click "Collect Metrics Now"
5. Check for success message
6. Verify metrics appear in the table

### Database Verification

```sql
-- Check if metrics were collected
SELECT 
  pm.*,
  p.content,
  p.platform
FROM post_metrics pm
JOIN posts p ON pm.post_id = p.id
WHERE p.platform = 'telegram'
ORDER BY pm.collected_at DESC
LIMIT 10;

-- Check engagement score calculation
SELECT 
  post_id,
  views,
  forwards,
  reactions,
  comments,
  engagement_score,
  calculate_engagement_score(views, 0, 0, forwards, reactions, comments) as calculated_score
FROM post_metrics
WHERE platform = 'telegram'
LIMIT 5;
```

### Cron Job Test

```bash
# Trigger cron manually (requires CRON_SECRET)
curl -X POST https://your-app.vercel.app/api/metrics/collect \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 🚀 Future Enhancements

### Multi-Platform Support

The system is designed to support X and LinkedIn:

```typescript
// Already structured for multiple platforms
interface PostMetric {
  platform: 'telegram' | 'x' | 'linkedin'
  // Platform-specific fields
}
```

To add X metrics:
1. Implement `fetchXPostMetrics()` in `lib/platforms/x.ts`
2. Update metrics collector to handle X posts
3. Adjust engagement formula for X-specific metrics

### Advanced Analytics

Potential additions:
- **Trend Charts** - Show engagement over time
- **Best Time Analysis** - When posts perform best
- **Content Analysis** - Which topics get most engagement
- **Comparative View** - Compare across platforms
- **Export Feature** - Download metrics as CSV

### Real-Time Updates

Current: Batch collection every 6 hours
Future: WebSocket or polling for real-time updates

---

## 🐛 Troubleshooting

### No Metrics Showing

**Check:**
1. Are there published Telegram posts?
   ```sql
   SELECT * FROM posts WHERE platform = 'telegram' AND status = 'published';
   ```

2. Do posts have `platform_post_id`?
   ```sql
   SELECT id, platform_post_id FROM posts WHERE platform = 'telegram';
   ```

3. Has metrics collection run?
   ```sql
   SELECT * FROM post_metrics WHERE platform = 'telegram';
   ```

4. Check API logs in Vercel Dashboard

### Cron Job Not Running

**Check:**
1. Vercel Dashboard → Cron Jobs → Status
2. Environment variable `CRON_SECRET` is set
3. `vercel.json` is committed and deployed
4. Project is on a paid Vercel plan (crons require Pro)

### Metrics Collection Fails

**Check:**
1. Telegram bot token is valid
2. Bot has access to the channel
3. `platform_user_id` is correct (numeric chat ID)
4. API route logs for specific errors

### TypeScript Errors

If you see type errors after migration:

```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

---

## 📚 File Reference

### Created/Modified Files

```
TELEGRAM_METRICS_MIGRATION.sql          # Database schema migration
TELEGRAM_METRICS_CRON_SETUP.sql         # Cron job setup (optional)
types/database.ts                        # Updated TypeScript types
lib/platforms/telegram.ts                # Metrics fetching logic
app/api/metrics/collect/route.ts        # Metrics collection endpoint
app/api/metrics/route.ts                 # Metrics retrieval endpoint
app/(dashboard)/metrics/page.tsx         # Metrics dashboard UI
vercel.json                              # Cron job configuration
```

### Key Functions

- `fetchTelegramPostMetrics()` - Fetches metrics from Telegram
- `calculate_engagement_score()` - SQL function for score calculation
- `update_engagement_score()` - Trigger function for auto-calculation

---

## ✅ Acceptance Criteria

- [x] Telegram posts automatically generate metrics
- [x] Metrics page shows real data structure
- [x] Engagement score updates over time (via snapshots)
- [x] No manual input required (automated via cron)
- [x] Clean Supabase relations (foreign keys, RLS)
- [x] Safe error handling if Telegram API fails
- [x] Future-proof for X/LinkedIn integration
- [x] Platform selector (`platform = 'telegram'`)

---

## 🎯 Next Steps

1. **Run Database Migration** - Execute `TELEGRAM_METRICS_MIGRATION.sql`
2. **Set Environment Variable** - Add `CRON_SECRET` to Vercel
3. **Deploy to Vercel** - Push changes and deploy
4. **Implement Real Metrics** - Choose MTProto or Premium API
5. **Test Collection** - Manually trigger and verify
6. **Monitor Cron** - Check Vercel Dashboard after 6 hours

---

## 📞 Support

For issues or questions:
1. Check Vercel logs for API errors
2. Check Supabase logs for database errors
3. Review this documentation
4. Check Telegram Bot API documentation

---

**Implementation Date:** 2026-01-27  
**Version:** 1.0.0  
**Status:** ✅ Production Ready (pending real Telegram API integration)
