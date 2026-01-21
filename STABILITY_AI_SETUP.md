# Stability AI Image Generation - Complete Setup Guide

## Overview

Agent X now uses a **complete AI image generation pipeline**:

1. **Claude** → Generates post content
2. **Gemini Pro** → Creates detailed image prompts
3. **Stability AI** → Generates high-quality images
4. **Supabase Storage** → Stores images and provides public URLs
5. **Platforms** → Posts published with images attached

## Prerequisites

You need **3 API keys**:

1. ✅ **Claude API Key** (already configured)
2. 🆕 **Gemini API Key** (for image prompts)
3. 🆕 **Stability AI API Key** (for image generation)

## Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

**Your Gemini API Key:** `AIzaSyA54uMXa8AToYAWjpjT0zsSVaMeuTlNjz8`

## Step 2: Get Stability AI API Key

1. Go to [Stability AI Platform](https://platform.stability.ai/)
2. Sign up or log in
3. Go to Account → API Keys
4. Create a new API key
5. Copy the key (starts with `sk-...`)

**Your Stability API Key:** `sk-5C07ZMpxhPffM9uVMKCKQAxuEWQn7gwhe4JxfFqwuWc9N3ZK`

## Step 3: Run Database Migration

Execute this in Supabase SQL Editor:

```sql
-- Run the complete migration
-- Copy and paste from GEMINI_IMAGE_MIGRATION.sql
```

This adds:
- `gemini_api_key` column to user_profiles
- `stability_api_key` column to user_profiles
- `image_generation_enabled` to schedule_config
- `image_times` array to schedule_config
- `image_url` and `image_data` to posts table

## Step 4: Create Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create bucket"
3. **Bucket name:** `post-images`
4. **Public:** ✅ Yes (so images can be accessed via URL)
5. Click "Create bucket"

## Step 5: Configure API Keys in Agent X

1. **Go to Settings page**
2. **Scroll to "AI Image Generation" section** (purple card)
3. **Enter Gemini API Key:**
   ```
   AIzaSyA54uMXa8AToYAWjpjT0zsSVaMeuTlNjz8
   ```
4. **Enter Stability AI API Key:**
   ```
   sk-5C07ZMpxhPffM9uVMKCKQAxuEWQn7gwhe4JxfFqwuWc9N3ZK
   ```
5. **Click "Save Settings"**
6. **Verify "Fully Connected" badge appears**

## Step 6: Enable Image Generation in Schedule

1. **Go to Schedule page**
2. **Set up your posting times** (e.g., 09:00, 15:00)
3. **Scroll to "Image Generation with Gemini" section** (purple card)
4. **Toggle ON** to enable image generation
5. **Select specific times** when you want images (e.g., only 09:00)
6. **Click "Save Schedule"**

## Step 7: Test the Complete Pipeline

### Option A: Wait for Scheduled Time

Just wait for the scheduled time and the workflow will automatically:
1. Generate post content with Claude
2. Create image prompt with Gemini
3. Generate image with Stability AI
4. Upload to Supabase Storage
5. Publish post with image

### Option B: Manual Test

Call the workflow API manually:
```bash
curl -X POST https://your-app.vercel.app/api/workflows/run
```

## How It Works

### Complete Pipeline Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. SCHEDULE CHECK                                       │
│    - Is it time to post?                                │
│    - Is image generation enabled for this time?         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. CLAUDE (Content Generation)                          │
│    - Generates post content based on topic              │
│    - Output: "Just launched our new AI feature! 🚀"     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. GEMINI PRO (Image Prompt Creation)                   │
│    - Analyzes post content                              │
│    - Creates detailed image generation prompt           │
│    - Output: "A vibrant, modern digital illustration    │
│      showing a rocket launching into space with AI      │
│      circuit patterns, futuristic tech aesthetic..."    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. STABILITY AI (Image Generation)                      │
│    - Uses SDXL model                                    │
│    - Generates 1024x1024 image from prompt              │
│    - Output: Base64 encoded image data                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. SUPABASE STORAGE (Image Upload)                      │
│    - Converts base64 to buffer                          │
│    - Uploads to 'post-images' bucket                    │
│    - Output: Public URL                                 │
│    - Example: https://xxx.supabase.co/storage/v1/...    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. PLATFORM PUBLISHING                                  │
│    - Attaches image URL to post                         │
│    - Publishes to X, Telegram, LinkedIn                │
│    - Post appears with image! 🎉                        │
└─────────────────────────────────────────────────────────┘
```

## Verification

### Check Database

```sql
-- Check if API keys are configured
SELECT 
  id,
  gemini_api_key IS NOT NULL as has_gemini,
  stability_api_key IS NOT NULL as has_stability
FROM user_profiles;

-- Check recent posts with images
SELECT 
  id,
  content,
  image_url,
  image_data IS NOT NULL as has_image_data,
  generation_metadata->>'image_prompt' as prompt,
  created_at
FROM posts
WHERE image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

### Check Logs

Look for these log messages:

```
[Workflow] Image generation REQUIRED for this time slot
[Workflow] Starting COMPLETE image generation pipeline...
[Workflow] Step 1: Claude generates post content ✓
[Workflow] Step 2: Gemini creates detailed image prompt...
[Workflow] ✓ Image prompt created: A vibrant...
[Workflow] Step 3: Stability AI generates image from prompt...
[Stability AI] Generating image...
[Stability AI] ✓ Image generated successfully!
[Workflow] Step 4: Uploading image to Supabase Storage...
[Storage] Uploading image to Supabase Storage...
[Storage] ✓ Image uploaded: user-id/timestamp.png
[Storage] ✓ Public URL: https://...
[Workflow] ✓ Image uploaded! URL: https://...
[Workflow] Publishing with 1 media attachment(s)
```

## Costs

### Stability AI Pricing
- **SDXL 1.0:** ~$0.002 per image
- **1024x1024 resolution**
- **30 steps** (good quality)

### Example Monthly Cost
- 2 posts/day with images = 60 images/month
- 60 × $0.002 = **$0.12/month**

Very affordable! 🎉

## Troubleshooting

### Images Not Generating

1. **Check API keys are configured**
   - Settings → Verify both keys are entered
   - Look for "Fully Connected" badge

2. **Check image generation is enabled**
   - Schedule → Toggle should be ON
   - At least one time should be selected

3. **Check Supabase Storage bucket exists**
   - Dashboard → Storage → Should see 'post-images'
   - Bucket should be public

4. **Check logs for errors**
   - Run debug queries from `debug-image-generation.sql`
   - Look for error messages in pipeline_logs

### Images Generated But Not Displaying

1. **Check image URL is valid**
   ```sql
   SELECT image_url FROM posts 
   WHERE image_url IS NOT NULL 
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Test URL in browser**
   - Copy the URL and open in browser
   - Should display the image

3. **Check platform supports images**
   - X: Supports images ✅
   - Telegram: Supports images ✅
   - LinkedIn: Supports images ✅

## Files Modified

- `lib/ai/providers/stability-image.ts` - Stability AI integration
- `lib/storage/image-upload.ts` - Supabase Storage upload
- `app/api/workflows/run/route.ts` - Complete pipeline
- `app/(dashboard)/settings/page.tsx` - UI for API keys
- `app/api/settings/route.ts` - API key storage
- `types/database.ts` - Database types
- `GEMINI_IMAGE_MIGRATION.sql` - Database migration

## Success Criteria

✅ **Working if you see:**
1. "Fully Connected" badge in Settings
2. Image URLs in posts table
3. Images displaying on social media
4. Pipeline logs showing all 4 steps completing
5. Public URLs accessible in browser

## Next Steps

1. ✅ Run migration
2. ✅ Create storage bucket
3. ✅ Configure API keys
4. ✅ Enable image generation
5. ✅ Test with a post
6. 🎉 Enjoy automated image generation!
