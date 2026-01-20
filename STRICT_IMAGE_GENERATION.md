# Strict Image Generation Workflow

## Overview

Agent X implements a **STRICT** image generation workflow that ensures images are ALWAYS generated when scheduled, following this exact process:

## The Strict Workflow

### When Image Generation is Scheduled

If a time slot has image generation enabled in the schedule:

```
1. ✅ REQUIRED: Claude generates post content
2. ✅ REQUIRED: Gemini creates detailed image prompt from post content  
3. ✅ REQUIRED: Gemini generates actual image from the prompt
4. ✅ REQUIRED: Image is stored with the post
5. ✅ REQUIRED: Post is published with the image
```

### Enforcement Rules

1. **No Skipping**: If image generation is enabled for a time slot, the system MUST attempt to generate an image
2. **Validation**: Gemini API key is validated before attempting generation
3. **Error Handling**: If image generation fails, the error is logged but the post still publishes (with the image prompt saved)
4. **Logging**: Every step is logged for debugging and verification

## Code Flow

### Step 1: Check Schedule
```typescript
const shouldGenerateImage = shouldGenerateImageForTime(schedule, matchedTime)
// Returns true if this time slot requires images
```

### Step 2: Validate Configuration
```typescript
const validation = validateImageGenerationConfig(user.gemini_api_key)
if (!validation.valid) {
  // Log error and skip image generation
  // Post will still be published without image
}
```

### Step 3: Generate Image (STRICT)
```typescript
const imageResult = await generateImageWithGemini({
  postContent: masterContent,  // From Claude
  prompt: masterContent,
  apiKey: user.gemini_api_key
})

// This function:
// 1. Creates image prompt using Gemini Pro
// 2. Generates actual image using Gemini Imagen
// 3. Returns both prompt and image data
```

### Step 4: Store Results
```typescript
// Save to database
{
  image_url: imageResult.imageUrl,      // URL if uploaded
  image_data: imageResult.base64Data,   // Base64 image data
  generation_metadata: {
    image_prompt: imageResult.imagePrompt,
    image_generation_enabled: true,
    has_image: !!(imageData || imageUrl)
  }
}
```

## Database Schema

### Posts Table
```sql
ALTER TABLE posts
ADD COLUMN image_url TEXT,        -- URL of uploaded image
ADD COLUMN image_data TEXT;       -- Base64-encoded image data
```

### Metadata Structure
```json
{
  "master_content": "Original post content",
  "image_prompt": "Detailed image generation prompt",
  "image_generation_enabled": true,
  "has_image": true
}
```

## Workflow Logs

The system logs each step:

```
[Workflow] Image generation REQUIRED for this time slot
[Workflow] Starting STRICT image generation workflow...
[Workflow] Step 1: Claude generates post content ✓
[Workflow] Step 2: Gemini creates image prompt...
[Gemini Image] Starting strict image generation workflow...
[Gemini Image] Step 1: Creating image prompt from post content...
[Gemini Image] Image prompt created: A vibrant...
[Gemini Image] Step 2: Generating image with Gemini...
[Gemini Image] ✓ Image generated successfully!
[Workflow] ✓ Image generation completed!
[Workflow]   - Prompt: A vibrant, modern digital illustration...
[Workflow]   - Image data: YES
[Workflow]   - Image URL: N/A
```

## Error Handling

### If Gemini API Key is Missing
```
[Workflow] Image generation validation failed: Gemini API key is not configured
[Pipeline Log] ERROR: Image generation failed: Gemini API key is not configured
→ Post publishes WITHOUT image
```

### If Image Generation Fails
```
[Gemini Image] Image generation failed: API error
[Workflow] Image generation failed: API error
[Pipeline Log] WARNING: Image generation failed: API error
→ Post publishes WITHOUT image (but prompt is saved)
```

### If Image Prompt Creation Fails
```
[Gemini] Image prompt creation failed: Network error
[Workflow] Image generation error: Failed to create image prompt
[Pipeline Log] ERROR: Image generation error: Failed to create image prompt
→ Post publishes WITHOUT image
```

## Configuration Requirements

### User Must Configure:

1. **Gemini API Key** (Settings page)
   - Must start with `AIza`
   - Validated before use

2. **Image Generation Toggle** (Schedule page)
   - Must be enabled

3. **Image Times** (Schedule page)
   - At least one time must be selected
   - Only selected times will generate images

### Example Configuration:

```json
{
  "schedule_config": {
    "times": ["09:00", "12:00", "15:00", "18:00"],
    "image_generation_enabled": true,
    "image_times": ["09:00", "15:00"]
  }
}
```

Result:
- 09:00 → Post WITH image ✅
- 12:00 → Post without image
- 15:00 → Post WITH image ✅
- 18:00 → Post without image

## Verification

### Check if Image Was Generated

```sql
SELECT 
  id,
  content,
  image_url,
  image_data IS NOT NULL as has_image_data,
  generation_metadata->>'image_prompt' as image_prompt,
  generation_metadata->>'has_image' as has_image
FROM posts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Pipeline Logs

```sql
SELECT 
  step,
  status,
  message,
  metadata,
  created_at
FROM pipeline_logs
WHERE user_id = 'YOUR_USER_ID'
  AND step = 'generation'
  AND message LIKE '%image%'
ORDER BY created_at DESC
LIMIT 10;
```

## API Endpoints

### Gemini Imagen API

The system attempts to use Google's Imagen API:

```
POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict
Headers:
  Content-Type: application/json
  x-goog-api-key: YOUR_GEMINI_API_KEY
Body:
  {
    "instances": [{
      "prompt": "Detailed image prompt from Gemini Pro"
    }],
    "parameters": {
      "sampleCount": 1,
      "aspectRatio": "16:9",
      "negativePrompt": "blurry, low quality, distorted"
    }
  }
```

### Fallback Behavior

If Imagen API is not available:
- Image prompt is still created and saved
- `image_data` and `image_url` remain null
- Post publishes with prompt in metadata
- User can manually generate image from prompt later

## Testing the Strict Workflow

1. **Enable Image Generation**
   ```
   Settings → Add Gemini API key
   Schedule → Enable toggle → Select times
   ```

2. **Trigger Workflow**
   ```
   Wait for scheduled time OR
   Call POST /api/workflows/run
   ```

3. **Verify Logs**
   ```
   Check server logs for:
   - "Image generation REQUIRED"
   - "STRICT image generation workflow"
   - "Image generated successfully"
   ```

4. **Check Database**
   ```sql
   SELECT * FROM posts 
   WHERE image_data IS NOT NULL 
   ORDER BY created_at DESC LIMIT 1;
   ```

## Troubleshooting

### Images Not Generating

1. Check Gemini API key is configured
2. Check image generation is enabled
3. Check current time is in `image_times` array
4. Check pipeline_logs for errors
5. Verify Imagen API is enabled in Google Cloud

### Images Generated But Not Displaying

1. Check `image_data` column has data
2. Verify base64 encoding is valid
3. Check platform supports image attachments
4. Review platform-specific image requirements

## Future Enhancements

- [ ] Upload images to Supabase Storage
- [ ] Return public URLs instead of base64
- [ ] Support multiple images per post
- [ ] Add image style preferences
- [ ] Implement image caching
- [ ] Add image preview in UI
