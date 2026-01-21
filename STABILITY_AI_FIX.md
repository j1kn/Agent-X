# Stability AI Image Generation Fix

## Problem Identified

The Stability AI image generation was failing because the code was using:

1. **Deprecated API endpoint**: `/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`
2. **Old payload format**: `text_prompts` array with weights
3. **Wrong response structure**: Looking for `artifacts` array

## Root Cause

Stability AI has migrated to a new API structure:
- **Old API**: v1 generation endpoints (deprecated)
- **New API**: v2beta Stable Image endpoints (current)

The old endpoint either:
- Returns 404 (endpoint removed)
- Returns different response structure
- Has different authentication requirements

## Solution Implemented

### 1. Updated API Endpoint

**Before:**
```typescript
'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image'
```

**After:**
```typescript
'https://api.stability.ai/v2beta/stable-image/generate/core'
```

### 2. Fixed Request Payload

**Before (JSON):**
```json
{
  "text_prompts": [
    { "text": "prompt", "weight": 1 },
    { "text": "negative", "weight": -1 }
  ],
  "cfg_scale": 7,
  "height": 1024,
  "width": 1024,
  "steps": 30,
  "samples": 1
}
```

**After (FormData):**
```typescript
const formData = new FormData()
formData.append('prompt', prompt)
formData.append('negative_prompt', negativePrompt)
formData.append('aspect_ratio', '1:1')
formData.append('output_format', 'png')
```

### 3. Fixed Response Parsing

**Before:**
```typescript
if (data.artifacts && data.artifacts.length > 0) {
  const base64Image = data.artifacts[0].base64
}
```

**After:**
```typescript
if (data.image) {
  const base64Image = data.image
}
```

### 4. Enhanced Error Handling

Added specific error messages for common failures:

- **401**: Authentication failed - check API key
- **402**: Out of credits - add credits to account
- **429**: Rate limit exceeded - wait before retrying
- **400**: Bad request - malformed payload

### 5. Improved Logging

Added comprehensive logging:
- Request details (endpoint, model, aspect ratio)
- Response status and headers
- Image generation success with size
- Detailed error information

## Files Modified

### [`lib/ai/providers/stability-image.ts`](lib/ai/providers/stability-image.ts)

- Updated `generateImageWithStability()` function
- Changed API endpoint to v2beta
- Switched from JSON to FormData payload
- Fixed response parsing
- Enhanced error handling and logging

## Testing

Run the test script to verify the fix:

```bash
npx tsx test-stability-fix.ts
```

Expected output:
```
=== Testing Stability AI Image Generation ===

✓ API key found
✓ Key format: sk-xxx...xxxx

Test Prompt:
A minimalist, futuristic illustration...

Calling Stability AI API...
Endpoint: https://api.stability.ai/v2beta/stable-image/generate/core
Model: stable-image-core
Aspect Ratio: 1:1 (1024x1024)

⏱️  Request completed in 3.45s

✅ SUCCESS - Image generated!
✓ Base64 data length: 123456 characters
✓ Estimated size: ~92 KB

✅ TEST PASSED - Stability AI integration is working correctly!
```

## API Specifications

### Endpoint
```
POST https://api.stability.ai/v2beta/stable-image/generate/core
```

### Headers
```
Authorization: Bearer <API_KEY>
Accept: application/json
```

### Request Body (FormData)
```
prompt: string (required)
negative_prompt: string (optional)
aspect_ratio: "1:1" | "16:9" | "21:9" | "2:3" | "3:2" | "4:5" | "5:4" | "9:16" | "9:21"
output_format: "png" | "jpeg" | "webp"
```

### Response
```json
{
  "image": "base64_encoded_image_data",
  "finish_reason": "SUCCESS"
}
```

### Credits
- **1 image** = **~1 credit** (1024x1024)
- Check balance at: https://platform.stability.ai/account/credits

## Integration Points

The fixed function is used in:

1. **[`app/api/cron/publish/route.ts`](app/api/cron/publish/route.ts)** (line 281)
   - Autopilot workflow image generation
   - Called when `shouldGenerateImage` is true

2. **[`app/api/workflows/run/route.ts`](app/api/workflows/run/route.ts)** (line 224)
   - Manual workflow execution
   - Same image generation logic

## Verification Checklist

- [x] API endpoint updated to v2beta
- [x] Request payload uses FormData
- [x] Response parsing looks for `data.image`
- [x] Error handling covers 401, 402, 429, 400
- [x] Logging includes request/response details
- [x] Test script created
- [x] Documentation updated

## Common Issues & Solutions

### Issue: "Authentication failed"
**Solution:** Check that `STABILITY_API_KEY` in `.env.local` starts with `sk-`

### Issue: "Out of credits"
**Solution:** Add credits at https://platform.stability.ai/account/credits

### Issue: "Rate limit exceeded"
**Solution:** Wait 60 seconds between requests (free tier limit)

### Issue: "No image returned"
**Solution:** Check console logs for detailed error message

## Next Steps

1. Run test script to verify fix: `npx tsx test-stability-fix.ts`
2. Check autopilot workflow generates images correctly
3. Monitor `pipeline_logs` table for image generation logs
4. Verify images appear in posts with `image_url` populated

## References

- [Stability AI API Documentation](https://platform.stability.ai/docs/api-reference)
- [Stable Image Core Endpoint](https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1core/post)
- [API Keys Management](https://platform.stability.ai/account/keys)
- [Credits & Pricing](https://platform.stability.ai/account/credits)
