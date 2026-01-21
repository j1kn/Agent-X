# Image Generation Guide

## Overview

Agent X now supports automatic image generation for social media posts using Stability AI. Images are generated, stored permanently in Supabase Storage, and attached to posts.

---

## How It Works

### 1. Manual Generation (Dashboard)

Two buttons available on the dashboard:

#### **"Generate Post"** (Blue Button)
- Generates text-only posts
- Fast generation (~5 seconds)
- No image attached
- Uses Claude for content generation

#### **"Generate Post with Image"** (Purple Button)
- Generates post with AI image
- Slower generation (~15-30 seconds)
- Image permanently stored
- Uses Claude + Stability AI

**Process:**
1. Click "Generate Post with Image"
2. Claude generates content + image prompt
3. Stability AI generates 1024×1024 image
4. Image uploaded to Supabase Storage
5. Posts scheduled with image URL
6. Image preview shown in dashboard

---

### 2. Automatic Generation (Cron Jobs)

The cron job **intelligently chooses** between text-only and image generation based on your schedule configuration.

#### Schedule Configuration

In your `schedule_config` table:

```sql
{
  "times": ["09:00", "14:00", "18:00"],
  "image_generation_enabled": true,
  "image_times": ["09:00", "18:00"]
}
```

**Behavior:**
- **09:00** → Generates post **WITH image** (in image_times)
- **14:00** → Generates post **WITHOUT image** (not in image_times)
- **18:00** → Generates post **WITH image** (in image_times)

#### How Cron Decides

```typescript
// In app/api/cron/publish/route.ts
const shouldGenerateImage = shouldGenerateImageForTime(schedule, matchedTime)

if (shouldGenerateImage) {
  // Generate image with Stability AI
  // Upload to Supabase Storage
  // Attach to posts
} else {
  // Generate text-only post
}
```

---

## Image Storage

### Supabase Storage Structure

```
post-images/                    (bucket)
  └── [user-id]/               (folder per user)
      ├── 1737467890123.png    (timestamp-based filename)
      ├── 1737467950456.png
      └── 1737468010789.png
```

### Storage Features

- ✅ **Permanent storage** - Images never disappear
- ✅ **Public URLs** - Accessible without authentication
- ✅ **Organized by user** - Easy to manage
- ✅ **Unique filenames** - No conflicts (timestamp-based)
- ✅ **CDN-backed** - Fast delivery worldwide

### Database Storage

Images are stored in **two places**:

1. **Supabase Storage** (permanent, public URL)
   - URL: `https://[project].supabase.co/storage/v1/object/public/post-images/[user-id]/[timestamp].png`
   - Stored in: `posts.image_url`

2. **Database** (base64 backup)
   - Base64 data stored in: `posts.image_data`
   - Used as fallback if storage URL fails

---

## Setup Instructions

### 1. Configure Supabase Storage

Run [`SUPABASE_STORAGE_SETUP.sql`](SUPABASE_STORAGE_SETUP.sql) in Supabase SQL Editor:

```sql
-- Creates post-images bucket
-- Sets up public access policies
-- Allows authenticated users to upload
-- Allows service role (cron) to upload
```

### 2. Configure Environment Variables

In Vercel or `.env.local`:

```bash
# Required for image generation
STABILITY_API_KEY=sk-xxx...

# Already configured
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ANTHROPIC_API_KEY=sk-ant-xxx...
```

### 3. Configure Schedule

Set up your posting schedule with image times:

```sql
UPDATE schedule_config
SET 
  times = ARRAY['09:00', '14:00', '18:00'],
  image_generation_enabled = true,
  image_times = ARRAY['09:00', '18:00'],
  timezone = 'Europe/London'
WHERE user_id = 'YOUR_USER_ID';
```

**Result:**
- Posts at 09:00 and 18:00 will have images
- Post at 14:00 will be text-only

---

## API Endpoints

### Manual Generation

#### POST `/api/posts/generate`
Generates text-only post

**Response:**
```json
{
  "success": true,
  "masterContent": "Post content...",
  "posts": [
    {
      "postId": "uuid",
      "platform": "x",
      "content": "Post content...",
      "scheduledFor": "2026-01-21T14:00:00Z"
    }
  ]
}
```

#### POST `/api/posts/generate-with-image`
Generates post with image

**Response:**
```json
{
  "success": true,
  "masterContent": "Post content...",
  "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/post-images/...",
  "imagePrompt": "A minimalist illustration...",
  "posts": [
    {
      "postId": "uuid",
      "platform": "x",
      "content": "Post content...",
      "scheduledFor": "2026-01-21T14:00:00Z"
    }
  ]
}
```

### Automatic Generation

#### POST `/api/cron/publish`
Triggered by Supabase cron every 5 minutes

**Logic:**
1. Check if current time matches schedule
2. Check if time is in `image_times` array
3. If yes → generate with image
4. If no → generate text-only
5. Publish to connected platforms

---

## Troubleshooting

### Issue: Images Not Generating

**Check:**
1. `STABILITY_API_KEY` is set in environment variables
2. Stability AI account has credits
3. `image_generation_enabled = true` in schedule_config
4. Current time is in `image_times` array

**Debug:**
```sql
-- Check schedule configuration
SELECT * FROM schedule_config WHERE user_id = 'YOUR_USER_ID';

-- Check recent pipeline logs
SELECT * FROM pipeline_logs 
WHERE user_id = 'YOUR_USER_ID' 
AND step = 'generation'
ORDER BY created_at DESC 
LIMIT 10;
```

### Issue: Images Disappearing

**Cause:** Supabase Storage bucket not configured or policies missing

**Fix:**
1. Run [`SUPABASE_STORAGE_SETUP.sql`](SUPABASE_STORAGE_SETUP.sql)
2. Verify bucket exists:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'post-images';
   ```
3. Check policies:
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE tablename = 'objects' 
   AND schemaname = 'storage';
   ```

### Issue: Cron Not Generating Images

**Check:**
1. Schedule configuration has `image_times` set
2. Current time matches one of the `image_times`
3. Cron job is running (check Supabase cron logs)

**Test manually:**
```bash
curl -X POST https://YOUR-DOMAIN.vercel.app/api/cron/publish
```

---

## Image Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Action or Cron Trigger                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ Check if image needed    │
              │ (schedule.image_times)   │
              └──────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌────────────────────┐  ┌────────────────────┐
    │ Text-Only Mode     │  │ Image Mode         │
    └────────────────────┘  └────────────────────┘
                │                       │
                │                       ▼
                │           ┌────────────────────┐
                │           │ Claude generates   │
                │           │ content + prompt   │
                │           └────────────────────┘
                │                       │
                │                       ▼
                │           ┌────────────────────┐
                │           │ Stability AI       │
                │           │ generates image    │
                │           └────────────────────┘
                │                       │
                │                       ▼
                │           ┌────────────────────┐
                │           │ Upload to Storage  │
                │           │ Get public URL     │
                │           └────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
              ┌──────────────────────────┐
              │ Create posts in DB       │
              │ with/without image_url   │
              └──────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ Schedule for publishing  │
              └──────────────────────────┘
```

---

## Cost Considerations

### Stability AI Credits

- **1 image** = **~1 credit** (1024×1024)
- **100 credits** = **$10**
- **Average cost per image**: **$0.10**

### Recommendations

- Use `image_times` to control frequency
- Generate images for high-impact posts (morning, evening)
- Use text-only for mid-day posts
- Monitor credit usage in Stability AI dashboard

---

## Best Practices

### 1. Strategic Image Times

```sql
-- Example: Images for morning and evening posts only
UPDATE schedule_config SET
  times = ARRAY['07:00', '12:00', '17:00', '21:00'],
  image_times = ARRAY['07:00', '21:00'];
```

**Result:**
- 07:00 → Image (high engagement time)
- 12:00 → Text only
- 17:00 → Text only
- 21:00 → Image (high engagement time)

### 2. Image Prompt Quality

Claude generates image prompts automatically. For best results:
- Use descriptive topics
- Set appropriate tone (professional, casual, etc.)
- Review generated prompts in pipeline_logs

### 3. Storage Management

Images are stored permanently. To clean up old images:

```sql
-- Find old images (older than 90 days)
SELECT image_url FROM posts 
WHERE created_at < NOW() - INTERVAL '90 days'
AND image_url IS NOT NULL;

-- Delete from storage (use with caution)
-- Implement cleanup script if needed
```

---

## Related Files

- [`app/api/posts/generate-with-image/route.ts`](app/api/posts/generate-with-image/route.ts) - Manual image generation API
- [`app/api/cron/publish/route.ts`](app/api/cron/publish/route.ts) - Automatic generation with smart image logic
- [`lib/ai/providers/stability-image.ts`](lib/ai/providers/stability-image.ts) - Stability AI integration
- [`lib/storage/image-upload.ts`](lib/storage/image-upload.ts) - Supabase Storage upload
- [`lib/autopilot/workflow-helpers.ts`](lib/autopilot/workflow-helpers.ts) - Time matching logic
- [`SUPABASE_STORAGE_SETUP.sql`](SUPABASE_STORAGE_SETUP.sql) - Storage bucket setup
- [`STABILITY_AI_FIX.md`](STABILITY_AI_FIX.md) - API fix documentation

---

## Support

If images are not generating or storing correctly:

1. Run diagnostic: `npx tsx debug-scheduling.ts`
2. Check pipeline logs in Supabase
3. Verify storage bucket exists
4. Test manual generation first
5. Check Stability AI credits
