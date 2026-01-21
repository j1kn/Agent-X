# Agent X Environment Variables Setup

## Required Environment Variables

Add these to your Vercel project:

### 1. Supabase (REQUIRED)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Get these from**: Supabase Dashboard → Settings → API

---

### 2. Token Encryption (REQUIRED)
```
TOKEN_ENCRYPTION_KEY=your-64-char-hex-string
```

**Generate with**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 3. Claude API Key (REQUIRED) ⭐
```
CLAUDE_API_KEY=sk-ant-api03-your-key-here
```

**This is the brain of Agent X!** Used for:
- ✅ Post content generation
- ✅ Image prompt creation (for Stability AI)
- ✅ All AI-powered features

**Get from**: https://console.anthropic.com/

**Important**:
- ✅ All users share this central AI key
- ✅ Users do NOT provide their own AI keys
- ✅ Agent X will not work without this key

---

### 4. Stability AI API Key (REQUIRED for Images) 🎨
```
STABILITY_API_KEY=sk-your-stability-key-here
```

**Used for**: AI image generation with Stability AI SDXL

**Get from**: https://platform.stability.ai/

**Important**:
- ✅ Required for automated image generation
- ✅ All users share this central key
- ✅ Cost: ~$0.002 per 1024x1024 image
- ✅ Claude creates the prompts, Stability generates the images

**How it works**:
1. Claude generates post content
2. Claude creates detailed image prompt
3. Stability AI generates image from prompt
4. Image uploaded to Supabase Storage
5. Post published with image

---

### 5. LinkedIn OAuth (OPTIONAL)
```
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
LINKEDIN_REDIRECT_URI=https://your-domain.vercel.app/api/accounts/linkedin/callback
```

**Only needed for**: LinkedIn Company Page posting

**Get from**: https://www.linkedin.com/developers/apps

---

## How to Add to Vercel

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your **Agent X** project
3. Click **Settings** tab
4. Click **Environment Variables**

### Step 2: Add Each Variable
For each variable:
1. Click **Add New**
2. Enter the **Name** (e.g., `CLAUDE_API_KEY`)
3. Enter the **Value** (e.g., `sk-ant-api03-...`)
4. Select **Production**, **Preview**, and **Development**
5. Click **Save**

### Step 3: Redeploy
After adding all variables:
1. Go to **Deployments** tab
2. Click **⋯** menu on latest deployment
3. Click **Redeploy**
4. Wait 1-2 minutes

---

## Verify It's Working

After redeployment, check:
1. Go to your Agent X website
2. Navigate to **Settings** page
3. Look for: **✓ AI Powered by Claude** (green)

If you see "⚠ AI Not Available":
- Check that `CLAUDE_API_KEY` is spelled correctly
- Ensure you selected all environments (Production, Preview, Development)
- Try redeploying again
- Check Vercel logs for errors

---

## Notes

- **X (Twitter)**: Users provide their own OAuth 1.0a credentials (not env vars)
- **Telegram**: Users provide their own Bot Token (not env vars)
- **No user AI keys needed**: Agent X uses your central Claude + Stability keys
- **LinkedIn is optional**: Only configure if users need Company Page posting
- **Image generation**: Fully automated with Claude + Stability AI
- **Cost per post with image**: ~$0.012 (Claude + Stability combined)

---

## Architecture Overview

### Simplified AI Pipeline

**Content Generation**:
- Claude API → Post content

**Image Generation** (when enabled):
- Claude API → Detailed image prompt
- Stability AI → Generate image from prompt
- Supabase Storage → Host image
- Platforms → Publish with image URL

### What Changed (v2.0)

**Removed**:
- ❌ Gemini API (no longer needed)
- ❌ Per-user API key configuration
- ❌ Complex multi-AI setup

**Added**:
- ✅ Claude creates both content AND image prompts
- ✅ Stability AI as built-in image generator
- ✅ Single, simplified pipeline
- ✅ Better image quality and context

### Benefits

1. **Simpler Setup**: Only 2 AI keys (Claude + Stability)
2. **Better Integration**: Claude understands post context for images
3. **Cost Effective**: ~$0.012 per post with image
4. **No User Config**: All AI keys are server-side
5. **Reliable**: Professional-grade APIs with high uptime

