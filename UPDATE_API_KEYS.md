# Update API Keys - Claude & Stability AI

This guide explains how to update the Claude API key and add the Stability AI API key to your Agent X deployment.

## API Keys to Update

### 1. Claude API Key (REQUIRED - Updated)
```
sk-ant-api03-[YOUR-NEW-CLAUDE-API-KEY]
```
**Note**: Get your actual key from the project owner or Anthropic console.

### 2. Stability AI API Key (NEW - Required for Image Generation)
```
sk-[YOUR-STABILITY-API-KEY]
```
**Note**: Get your actual key from https://platform.stability.ai/

---

## Deployment Platform: Vercel

### Step 1: Access Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Agent X** project
3. Click **Settings** in the top navigation
4. Click **Environment Variables** in the left sidebar

### Step 2: Update CLAUDE_API_KEY

1. Find the existing `CLAUDE_API_KEY` variable
2. Click the **⋮** (three dots) menu next to it
3. Click **Edit**
4. Replace the value with your new Claude API key (starts with `sk-ant-api03-`)
5. Ensure it's enabled for: **Production**, **Preview**, and **Development**
6. Click **Save**

### Step 3: Add STABILITY_API_KEY (New)

1. Click **Add New** button
2. Enter the **Name**: `STABILITY_API_KEY`
3. Enter the **Value**: Your Stability API key (starts with `sk-`)
4. Select environments: **Production**, **Preview**, and **Development**
5. Click **Save**

### Step 4: Redeploy

After updating environment variables, you need to redeploy:

1. Go to the **Deployments** tab
2. Click the **⋮** menu on the latest deployment
3. Click **Redeploy**
4. Confirm the redeployment

**OR** simply push a new commit to trigger automatic deployment.

---

## Local Development (.env.local)

If you're running Agent X locally, update your `.env.local` file:

```bash
# Claude API (Updated)
CLAUDE_API_KEY=sk-ant-api03-[YOUR-NEW-CLAUDE-API-KEY]

# Stability AI (New - for image generation)
STABILITY_API_KEY=sk-[YOUR-STABILITY-API-KEY]

# Your existing Supabase variables...
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TOKEN_ENCRYPTION_KEY=your-encryption-key
```

Then restart your development server:
```bash
npm run dev
```

---

## Architecture Changes

### Simplified Image Generation Pipeline

The new architecture uses **Claude for everything**:

1. **Claude** generates post content
2. **Claude** creates detailed image prompts
3. **Stability AI** generates images from Claude's prompts
4. **Supabase Storage** hosts the images
5. **Platforms** (X, Telegram) publish posts with images

### What Changed?

- ❌ **Removed**: Gemini API (no longer needed)
- ✅ **Simplified**: Claude handles both content AND image prompts
- ✅ **Built-in**: Stability API key is now a server-side environment variable
- ✅ **Automatic**: Users don't need to configure image generation API keys

### Benefits

- **Single AI Provider**: Only Claude API needed for content generation
- **Simpler Setup**: No per-user API key configuration for images
- **Cost Effective**: Stability AI SDXL costs ~$0.002 per 1024x1024 image
- **Better Quality**: Claude creates more detailed, contextual image prompts

---

## Verification

After updating the API keys and redeploying:

### 1. Check Environment Variables
```bash
# In Vercel dashboard, verify both keys are set:
✓ CLAUDE_API_KEY (starts with sk-ant-api03-)
✓ STABILITY_API_KEY (starts with sk-)
```

### 2. Test Content Generation
- Go to **Dashboard** → **Posts**
- Click **Generate Post**
- Verify Claude generates content successfully

### 3. Test Image Generation
- Go to **Dashboard** → **Schedule**
- Enable **Image Generation** for a time slot
- Wait for the scheduled time (or trigger manually)
- Check that posts include images

### 4. Check Logs
Monitor Vercel logs for:
```
[AI Generator] Generating content with Claude...
[AI Generator] ✓ Image prompt created: ...
[Workflow] Stability AI generates image...
[Workflow] ✓ Image uploaded! URL: ...
```

---

## Troubleshooting

### Claude API Key Issues

**Error**: `CLAUDE_API_KEY not configured in environment variables`

**Solution**:
1. Verify the key is set in Vercel environment variables
2. Ensure it's enabled for the correct environment (Production/Preview/Development)
3. Redeploy after adding/updating the key

### Stability API Key Issues

**Error**: `STABILITY_API_KEY not configured in environment variables`

**Solution**:
1. Add `STABILITY_API_KEY` to Vercel environment variables
2. Use the exact key: `sk-5C07ZMpxhPffM9uVMKCKQAxuEWQn7gwhe4JxfFqwuWc9N3ZK`
3. Redeploy after adding the key

### Image Generation Not Working

**Check**:
1. Is image generation enabled in Schedule settings?
2. Are you testing at a time slot with image generation enabled?
3. Check Vercel logs for error messages
4. Verify Stability API key is valid (starts with `sk-`)

---

## Security Notes

⚠️ **IMPORTANT**:
- Never commit API keys to version control
- Keep `.env.local` in `.gitignore`
- Only set environment variables in Vercel dashboard or secure local files
- Rotate keys periodically for security
- Monitor API usage to detect unauthorized access

---

## Cost Estimates

### Claude API (Anthropic)
- **Model**: claude-sonnet-4-5
- **Cost**: ~$3 per million input tokens, ~$15 per million output tokens
- **Usage**: ~500 tokens per post generation
- **Estimate**: ~$0.01 per post

### Stability AI (SDXL)
- **Model**: stable-diffusion-xl-1024-v1-0
- **Cost**: ~$0.002 per 1024x1024 image
- **Usage**: 1 image per post (when enabled)
- **Estimate**: $0.002 per image

### Total Cost Per Post with Image
- Content generation: ~$0.01
- Image generation: ~$0.002
- **Total**: ~$0.012 per post with image

---

## Next Steps

After updating the API keys:

1. ✅ Redeploy your Vercel application
2. ✅ Test content generation in the dashboard
3. ✅ Enable image generation in schedule settings
4. ✅ Monitor the first few automated posts
5. ✅ Check Supabase Storage for uploaded images
6. ✅ Verify posts appear correctly on X and Telegram

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review Supabase logs for database errors
3. Verify all environment variables are set correctly
4. Ensure you've redeployed after updating variables

For API-specific issues:
- **Claude**: [Anthropic Documentation](https://docs.anthropic.com/)
- **Stability AI**: [Stability AI Documentation](https://platform.stability.ai/docs)
