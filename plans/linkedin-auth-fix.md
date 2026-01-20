# LinkedIn OAuth Authentication Fix Plan

## 🔍 Root Cause Identified

**Primary Issue**: `NEXT_PUBLIC_SITE_URL` environment variable is **NOT SET** in Vercel.

### Why This Causes the Problem

When you click the LinkedIn connect button, the code in [`app/api/accounts/linkedin/connect/route.ts`](app/api/accounts/linkedin/connect/route.ts:34) uses this fallback:

```typescript
return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
```

Since `NEXT_PUBLIC_SITE_URL` is not set, it defaults to `http://localhost:3000` (without HTTPS), which causes:
- LinkedIn to reject the redirect (requires HTTPS in production)
- Users to see "wrong link without https" error
- OAuth flow to fail completely

### Current Configuration Status

✅ **LINKEDIN_REDIRECT_URI**: Correctly set with `https://`  
✅ **LINKEDIN_CLIENT_ID**: Set  
✅ **LINKEDIN_CLIENT_SECRET**: Set  
❌ **NEXT_PUBLIC_SITE_URL**: **NOT SET** ← This is the problem!

## 🎯 Solution: Two-Part Fix

### Part 1: Immediate Fix (Configuration)

**Action**: Set the missing environment variable in Vercel

**Steps**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name**: `NEXT_PUBLIC_SITE_URL`
   - **Value**: `https://your-actual-domain.vercel.app` (replace with your actual domain)
   - **Environments**: Select Production, Preview, and Development
3. Click "Save"
4. Go to Deployments tab → Click "Redeploy" on latest deployment

**Expected Result**: LinkedIn OAuth will work immediately after redeployment.

### Part 2: Code Improvements (Robustness)

**Action**: Make the code more resilient to missing environment variables

**Changes Needed**:
1. Auto-detect domain from request headers when `NEXT_PUBLIC_SITE_URL` is missing
2. Always ensure HTTPS protocol in production
3. Show user-friendly error messages instead of JSON responses
4. Add health check endpoint for configuration validation

## 📋 Detailed Implementation Plan

### Priority 1: Critical Fixes (Do First)

#### 1.1 Set Environment Variable in Vercel ⚡ URGENT

**What**: Add `NEXT_PUBLIC_SITE_URL` to Vercel environment variables

**Value Format**:
```
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

**Important Notes**:
- Must include `https://` protocol
- Must match your actual Vercel deployment URL
- Must be set for all environments (Production, Preview, Development)

**Verification**:
After setting and redeploying, test by clicking "Connect LinkedIn" button.

---

#### 1.2 Update Connect Route with Fallback Logic

**File**: [`app/api/accounts/linkedin/connect/route.ts`](app/api/accounts/linkedin/connect/route.ts)

**Changes**:

1. **Add helper function to get site URL with fallback**:
```typescript
function getSiteUrl(request: Request): string {
  // First, try environment variable
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  // Fallback: Extract from request headers
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  
  if (host) {
    // In production (Vercel), always use https
    const isProduction = !host.includes('localhost')
    const finalProtocol = isProduction ? 'https' : protocol
    return `${finalProtocol}://${host}`
  }
  
  // Last resort: localhost for development
  return 'http://localhost:3000'
}
```

2. **Replace all hardcoded fallbacks**:
```typescript
// OLD (line 34):
return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))

// NEW:
const siteUrl = getSiteUrl(request)
return NextResponse.redirect(new URL('/login', siteUrl))
```

3. **Update error responses to redirect instead of JSON**:
```typescript
// OLD (lines 44-49):
return NextResponse.json(
  { error: 'LinkedIn OAuth not configured. Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI.' },
  { status: 500 }
)

// NEW:
const siteUrl = getSiteUrl(request)
return NextResponse.redirect(
  new URL(`/accounts?error=${encodeURIComponent('LinkedIn OAuth not configured. Please contact administrator.')}`, siteUrl)
)
```

4. **Enhanced validation with better logging**:
```typescript
// Add after line 51
console.log('[LinkedIn OAuth DEBUG] Configuration check:', {
  hasClientId: !!clientId,
  hasClientSecret: !!process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: redirectUri,
  redirectUriValid: redirectUri?.startsWith('https://'),
  siteUrl: getSiteUrl(request),
})

// Validate redirect URI format
if (!redirectUri.startsWith('https://') && !redirectUri.includes('localhost')) {
  console.error('[LinkedIn OAuth DEBUG] Redirect URI must use HTTPS:', redirectUri)
  const siteUrl = getSiteUrl(request)
  return NextResponse.redirect(
    new URL(`/accounts?error=${encodeURIComponent('LinkedIn OAuth misconfigured. Redirect URI must use HTTPS.')}`, siteUrl)
  )
}
```

---

#### 1.3 Update Callback Route with Same Logic

**File**: [`app/api/accounts/linkedin/callback/route.ts`](app/api/accounts/linkedin/callback/route.ts)

**Changes**:

1. **Add the same `getSiteUrl()` helper function**

2. **Replace all fallback URLs** (lines 46, 54, 68, 84, 125, 144, 149):
```typescript
// OLD:
process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// NEW:
getSiteUrl(request)
```

3. **Example for line 46**:
```typescript
// OLD:
return NextResponse.redirect(
  new URL(`/accounts?error=${encodeURIComponent(errorDescription || error)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
)

// NEW:
const siteUrl = getSiteUrl(request)
return NextResponse.redirect(
  new URL(`/accounts?error=${encodeURIComponent(errorDescription || error)}`, siteUrl)
)
```

---

### Priority 2: Health Check & Debugging

#### 2.1 Create Health Check Endpoint

**File**: `app/api/accounts/linkedin/health/route.ts` (NEW)

**Purpose**: Allow admins to verify LinkedIn OAuth configuration

**Implementation**:
```typescript
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * LinkedIn OAuth Health Check
 * GET /api/accounts/linkedin/health
 * 
 * Returns configuration status for debugging
 */
export async function GET(request: Request) {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  
  // Extract fallback site URL from request
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const fallbackSiteUrl = host ? `${protocol}://${host}` : 'http://localhost:3000'
  
  const checks = {
    clientId: clientId ? '✓ Set' : '✗ Missing',
    clientSecret: clientSecret ? '✓ Set' : '✗ Missing',
    redirectUri: redirectUri 
      ? (redirectUri.startsWith('https://') ? `✓ Valid (${redirectUri})` : `⚠ Invalid - missing https:// (${redirectUri})`)
      : '✗ Missing',
    siteUrl: siteUrl 
      ? `✓ Set (${siteUrl})`
      : `⚠ Not set (falling back to ${fallbackSiteUrl})`,
  }
  
  const allConfigured = !!(clientId && clientSecret && redirectUri && redirectUri.startsWith('https://'))
  
  const warnings = []
  if (!siteUrl) {
    warnings.push('NEXT_PUBLIC_SITE_URL not set - using request-based fallback')
  }
  if (redirectUri && !redirectUri.startsWith('https://') && !redirectUri.includes('localhost')) {
    warnings.push('LINKEDIN_REDIRECT_URI must use https:// in production')
  }
  
  return NextResponse.json({
    configured: allConfigured,
    checks,
    warnings,
    recommendation: allConfigured 
      ? 'LinkedIn OAuth is properly configured ✓'
      : 'Please set missing environment variables in Vercel',
  })
}
```

**Usage**: Visit `https://your-domain.vercel.app/api/accounts/linkedin/health` to check configuration

---

### Priority 3: Documentation Updates

#### 3.1 Update ENV_SETUP.md

**File**: [`ENV_SETUP.md`](ENV_SETUP.md)

**Add to LinkedIn section** (after line 51):

```markdown
### 4. LinkedIn OAuth (OPTIONAL)
```
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
LINKEDIN_REDIRECT_URI=https://your-domain.vercel.app/api/accounts/linkedin/callback
```

**Only needed for**: LinkedIn Company Page posting

**Get from**: https://www.linkedin.com/developers/apps

**IMPORTANT**: 
- ✅ `LINKEDIN_REDIRECT_URI` MUST include `https://` protocol
- ✅ Must match exactly with LinkedIn app settings
- ✅ Replace `your-domain.vercel.app` with your actual Vercel domain

---

### 5. Site URL (REQUIRED for OAuth)
```
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

**Required for**: All OAuth flows (LinkedIn, X, etc.)

**Format**: Must include `https://` protocol

**Example**: `https://agent-x-production.vercel.app`

**Why needed**: Used for OAuth redirects and error handling

**Common mistake**: ❌ Setting as `your-domain.vercel.app` (missing https://)
**Correct format**: ✅ `https://your-domain.vercel.app`
```

---

#### 3.2 Create LinkedIn Troubleshooting Guide

**File**: `LINKEDIN_OAUTH_TROUBLESHOOTING.md` (NEW)

**Content**:
```markdown
# LinkedIn OAuth Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Redirect to wrong link without https"

**Symptoms**:
- Clicking "Connect LinkedIn" redirects to URL without https://
- OAuth flow fails immediately
- Error message about invalid redirect URI

**Root Cause**: `NEXT_PUBLIC_SITE_URL` environment variable not set in Vercel

**Solution**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_SITE_URL` = `https://your-domain.vercel.app`
3. Select all environments (Production, Preview, Development)
4. Save and redeploy

**Verification**: Visit `/api/accounts/linkedin/health` to check configuration

---

### Issue 2: "Redirect URI mismatch"

**Symptoms**:
- LinkedIn shows "redirect_uri_mismatch" error
- OAuth flow fails after LinkedIn authorization

**Root Cause**: Redirect URI in code doesn't match LinkedIn app settings

**Solution**:
1. Check your `LINKEDIN_REDIRECT_URI` in Vercel
2. Go to LinkedIn Developer Portal → Your App → Auth
3. Ensure redirect URI matches exactly (including https://)
4. Both should be: `https://your-domain.vercel.app/api/accounts/linkedin/callback`

---

### Issue 3: "LinkedIn OAuth not configured"

**Symptoms**:
- Error message when clicking "Connect LinkedIn"
- No redirect to LinkedIn

**Root Cause**: Missing LinkedIn environment variables

**Solution**:
Ensure all three variables are set in Vercel:
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`

---

### Issue 4: "No Company Pages found"

**Symptoms**:
- OAuth succeeds but shows "No LinkedIn Company Pages found"

**Root Cause**: User is not an admin of any LinkedIn Company Page

**Solution**:
1. Create a LinkedIn Company Page, OR
2. Get admin access to an existing Company Page
3. Try connecting again

---

## Health Check

Visit this URL to check your configuration:
```
https://your-domain.vercel.app/api/accounts/linkedin/health
```

Expected response when properly configured:
```json
{
  "configured": true,
  "checks": {
    "clientId": "✓ Set",
    "clientSecret": "✓ Set",
    "redirectUri": "✓ Valid (https://...)",
    "siteUrl": "✓ Set (https://...)"
  },
  "warnings": [],
  "recommendation": "LinkedIn OAuth is properly configured ✓"
}
```

---

## Required Environment Variables Checklist

- [ ] `LINKEDIN_CLIENT_ID` - From LinkedIn Developer Portal
- [ ] `LINKEDIN_CLIENT_SECRET` - From LinkedIn Developer Portal
- [ ] `LINKEDIN_REDIRECT_URI` - Must be `https://your-domain.vercel.app/api/accounts/linkedin/callback`
- [ ] `NEXT_PUBLIC_SITE_URL` - Must be `https://your-domain.vercel.app`

All must include `https://` protocol in production!

---

## LinkedIn Developer Portal Setup

1. Go to https://www.linkedin.com/developers/apps
2. Create new app or select existing
3. Go to "Auth" tab
4. Add redirect URL: `https://your-domain.vercel.app/api/accounts/linkedin/callback`
5. Request these scopes:
   - `openid`
   - `profile`
   - `email`
   - `w_member_social`
   - `r_organization_admin`
   - `w_organization_social`
6. Copy Client ID and Client Secret to Vercel

---

## Still Having Issues?

1. Check Vercel deployment logs for errors
2. Visit `/api/accounts/linkedin/health` for configuration status
3. Verify all environment variables are set for correct environment
4. Ensure LinkedIn app is not in "Development" mode (should be "Production")
5. Check that redirect URI matches exactly (case-sensitive)
```

---

## 📊 Implementation Checklist

### Immediate Actions (Do Now)

- [ ] **Set `NEXT_PUBLIC_SITE_URL` in Vercel**
  - Value: `https://your-actual-domain.vercel.app`
  - Environments: Production, Preview, Development
  
- [ ] **Redeploy application in Vercel**
  - Go to Deployments → Redeploy latest
  
- [ ] **Test LinkedIn OAuth flow**
  - Click "Connect LinkedIn"
  - Should redirect to LinkedIn with https://
  - Complete authorization
  - Should return to app successfully

### Code Changes (Next)

- [ ] Update [`app/api/accounts/linkedin/connect/route.ts`](app/api/accounts/linkedin/connect/route.ts)
  - Add `getSiteUrl()` helper function
  - Replace all hardcoded fallbacks
  - Change JSON errors to redirects
  - Add enhanced logging

- [ ] Update [`app/api/accounts/linkedin/callback/route.ts`](app/api/accounts/linkedin/callback/route.ts)
  - Add `getSiteUrl()` helper function
  - Replace all hardcoded fallbacks

- [ ] Create `app/api/accounts/linkedin/health/route.ts`
  - Implement health check endpoint
  - Test endpoint returns correct status

### Documentation (After Code Changes)

- [ ] Update [`ENV_SETUP.md`](ENV_SETUP.md)
  - Add `NEXT_PUBLIC_SITE_URL` section
  - Clarify LinkedIn configuration
  - Add common mistakes section

- [ ] Create `LINKEDIN_OAUTH_TROUBLESHOOTING.md`
  - Document all common issues
  - Add health check instructions
  - Include LinkedIn portal setup steps

- [ ] Update [`OAUTH_SETUP.md`](OAUTH_SETUP.md)
  - Add LinkedIn OAuth section
  - Document required scopes
  - Add troubleshooting reference

### Testing & Validation

- [ ] Test with `NEXT_PUBLIC_SITE_URL` set
- [ ] Test with `NEXT_PUBLIC_SITE_URL` not set (should use fallback)
- [ ] Test error scenarios (missing env vars)
- [ ] Verify health check endpoint works
- [ ] Confirm all redirects use https://
- [ ] Test complete OAuth flow end-to-end

---

## 🎯 Expected Outcomes

### After Setting Environment Variable

✅ LinkedIn OAuth redirects use `https://` protocol  
✅ No more "wrong link without https" errors  
✅ OAuth flow completes successfully  
✅ Users can connect LinkedIn Company Pages  

### After Code Changes

✅ Graceful fallback when `NEXT_PUBLIC_SITE_URL` not set  
✅ User-friendly error messages (no JSON responses)  
✅ Better debugging with health check endpoint  
✅ Comprehensive logging for troubleshooting  

### After Documentation Updates

✅ Clear setup instructions for LinkedIn OAuth  
✅ Troubleshooting guide for common issues  
✅ Easy verification with health check  

---

## 🚀 Quick Start (TL;DR)

**Immediate fix in 3 steps**:

1. **Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add**: `NEXT_PUBLIC_SITE_URL` = `https://your-domain.vercel.app`
3. **Redeploy** and test

**That's it!** LinkedIn OAuth should work immediately.

---

## 📞 Next Steps

1. **Set the environment variable** (5 minutes)
2. **Test the OAuth flow** (2 minutes)
3. **Implement code improvements** (30 minutes)
4. **Update documentation** (20 minutes)
5. **Final testing** (10 minutes)

**Total time**: ~1 hour for complete fix and improvements

---

**Ready to implement?** Start with setting `NEXT_PUBLIC_SITE_URL` in Vercel - that's the critical fix that will solve your immediate problem!
