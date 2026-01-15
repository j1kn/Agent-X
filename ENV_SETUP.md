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

**This is the brain of Agent X!** Used for ALL content generation.

**Get from**: https://console.anthropic.com/

**Important**:
- ✅ This is the ONLY AI key you need
- ✅ All users share this central AI key
- ✅ Users do NOT provide their own AI keys
- ✅ Agent X will not work without this key

---

### 4. LinkedIn OAuth (OPTIONAL)
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
- **No user AI keys needed**: Agent X uses your central Claude key
- **LinkedIn is optional**: Only configure if users need Company Page posting

