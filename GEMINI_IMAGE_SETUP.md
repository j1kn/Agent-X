# Gemini Image Generation Setup Guide

## Overview

Agent X now supports AI-generated image prompts using Google Gemini. When enabled, Gemini will analyze your post content and create detailed image generation prompts that can be used with image generation services.

## Features

- 🎨 **AI-Powered Image Prompts**: Gemini creates detailed, vivid image generation prompts based on your post content
- ⏰ **Flexible Scheduling**: Choose specific posting times to include images
- 🎯 **Smart Integration**: Seamlessly integrates with your existing posting workflow
- 🔒 **Secure**: API keys are encrypted and stored securely in your database
- 💜 **Beautiful UI**: Purple-themed interface to distinguish image generation features

## Setup Instructions

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (starts with `AIza...`)

### 2. Configure in Agent X

#### Add API Key in Settings

1. Navigate to **Settings** page
2. Find the **Gemini Image Generation** section (purple card)
3. Paste your API key in the input field
4. Click **Save Settings**

You should see a "Connected" badge when successfully configured.

#### Configure Schedule

1. Navigate to **Schedule** page
2. Set up your regular posting times if not already done
3. Find the **Image Generation with Gemini** section (purple card)
4. Toggle **ON** to enable image generation
5. Select which posting times should include images:
   - Check individual times, or
   - Click "Select all times" to add images to all posts
6. Click **Save Schedule**

## How It Works

### Workflow

1. **Scheduled Time**: When a scheduled posting time arrives
2. **Content Generation**: Claude generates the post content
3. **Image Prompt Check**: System checks if this time slot has image generation enabled
4. **Gemini Processing**: If enabled, Gemini analyzes the post content
5. **Prompt Creation**: Gemini creates a detailed image generation prompt
6. **Storage**: The image prompt is saved with the post metadata
7. **Publishing**: Post is published with the image prompt stored

### Example Flow

```
09:00 - Post without image (not in image_times)
12:00 - Post WITH image (in image_times) ✨
15:00 - Post without image (not in image_times)
18:00 - Post WITH image (in image_times) ✨
```

## Database Schema

### New Columns

**user_profiles table:**
```sql
gemini_api_key TEXT -- Stores encrypted Gemini API key
```

**schedule_config table:**
```sql
image_generation_enabled BOOLEAN DEFAULT FALSE
image_times TEXT[] DEFAULT '{}' -- Array of times like ['09:00', '15:00']
```

### Migration

Run the migration file to add these columns:

```bash
# In Supabase SQL Editor, run:
cat GEMINI_IMAGE_MIGRATION.sql
```

Or use the Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `GEMINI_IMAGE_MIGRATION.sql`
3. Execute the query

## Environment Variables

### Required for Claude (Already Set)
```bash
CLAUDE_API_KEY=sk-ant-api03-...
```

### Gemini API Key (User-Specific)
- **NOT** an environment variable
- Stored per-user in the database
- Each user configures their own Gemini API key in Settings

## API Endpoints

### Settings API (`/api/settings`)

**GET** - Retrieve user settings including Gemini status
```json
{
  "profile": {
    "gemini_api_key": "••••••••", // Masked for security
    ...
  },
  "isGeminiConnected": true
}
```

**POST** - Update Gemini API key
```json
{
  "gemini_api_key": "AIzaSyA54uMXa8AToYAWjpjT0zsSVaMeuTlNjz8"
}
```

### Schedule API (`/api/schedule`)

**GET** - Retrieve schedule including image settings
```json
{
  "schedule": {
    "image_generation_enabled": true,
    "image_times": ["09:00", "15:00"],
    ...
  }
}
```

**POST** - Update image generation settings
```json
{
  "image_generation_enabled": true,
  "image_times": ["09:00", "15:00"]
}
```

## Code Structure

### New Files

- `lib/ai/providers/gemini-image.ts` - Gemini image generation service
- `GEMINI_IMAGE_MIGRATION.sql` - Database migration
- `GEMINI_IMAGE_SETUP.md` - This documentation

### Modified Files

- `types/database.ts` - Added new column types
- `app/api/settings/route.ts` - Gemini API key handling
- `app/api/schedule/route.ts` - Image generation settings
- `app/(dashboard)/settings/page.tsx` - Gemini configuration UI
- `app/(dashboard)/schedule/page.tsx` - Image time selection UI
- `lib/pipeline/generator.ts` - Image prompt generation
- `lib/autopilot/workflow-helpers.ts` - Image time checking
- `app/api/workflows/run/route.ts` - Workflow integration

## Usage Examples

### Check if Image Should Be Generated

```typescript
import { shouldGenerateImageForTime } from '@/lib/autopilot/workflow-helpers'

const schedule = {
  image_generation_enabled: true,
  image_times: ['09:00', '15:00']
}

const shouldGenerate = shouldGenerateImageForTime(schedule, '09:00')
// Returns: true
```

### Generate Image Prompt

```typescript
import { createImagePromptWithGemini } from '@/lib/ai/providers/gemini-image'

const postContent = "Just launched our new AI feature! 🚀"
const apiKey = "AIzaSy..."

const imagePrompt = await createImagePromptWithGemini(postContent, apiKey)
// Returns: "A vibrant, modern tech illustration showing..."
```

## Troubleshooting

### Image Prompts Not Generating

1. **Check Gemini API Key**
   - Go to Settings
   - Verify "Connected" badge is shown
   - Try re-entering the API key

2. **Check Schedule Configuration**
   - Go to Schedule
   - Ensure toggle is ON
   - Verify times are selected

3. **Check Logs**
   - Look for `[Gemini Image]` or `[Generator]` logs
   - Check pipeline_logs table for errors

### API Key Issues

- **Invalid Key**: Ensure key starts with `AIza`
- **Quota Exceeded**: Check your Google Cloud quota
- **Permissions**: Ensure Gemini API is enabled in Google Cloud

## Security Notes

- API keys are stored in the database (consider encryption at rest)
- Keys are masked in API responses (`••••••••`)
- Never log or expose API keys in client-side code
- Each user manages their own API key

## Future Enhancements

Potential improvements for future versions:

1. **Actual Image Generation**: Integrate with Imagen or DALL-E APIs
2. **Image Storage**: Store generated images in Supabase Storage
3. **Image Preview**: Show image previews before posting
4. **Custom Styles**: Allow users to specify image styles
5. **Image Templates**: Pre-defined image prompt templates
6. **Multi-Image Posts**: Support for multiple images per post

## Cost Considerations

### Gemini API Pricing

- Gemini Pro is free for moderate usage
- Check [Google AI Pricing](https://ai.google.dev/pricing) for current rates
- Image prompt generation uses minimal tokens

### Recommendations

- Start with free tier
- Monitor usage in Google Cloud Console
- Set up billing alerts if needed

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review pipeline_logs in Supabase
3. Check browser console for errors
4. Verify all migration steps completed

## Version History

- **v1.0** (2026-01-20): Initial Gemini image generation support
  - Image prompt generation with Gemini Pro
  - Flexible time-based scheduling
  - Purple-themed UI components
  - Database schema updates
