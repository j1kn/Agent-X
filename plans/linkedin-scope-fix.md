# LinkedIn OAuth Scope Authorization Fix

## 🔍 Current Issue

**Error**: `Scope "w_organization_social" is not authorized for your application`

**Root Cause**: Your LinkedIn application in the LinkedIn Developer Portal doesn't have the required OAuth scopes approved/requested.

## 📋 Required Scopes

The code in [`app/api/accounts/linkedin/connect/route.ts`](app/api/accounts/linkedin/connect/route.ts:86) requests these scopes:

```typescript
'openid profile email w_member_social r_organization_admin w_organization_social'
```

### Scope Breakdown:

1. **`openid`** - Basic OpenID Connect authentication
2. **`profile`** - Access to user's profile information
3. **`email`** - Access to user's email address
4. **`w_member_social`** - Write posts as the authenticated member (personal profile)
5. **`r_organization_admin`** - Read organization admin data (to list Company Pages)
6. **`w_organization_social`** - Write posts to Company Pages ⚠️ **This is the missing one**

## 🎯 Solution: Configure LinkedIn Developer Portal

### Step 1: Access LinkedIn Developer Portal

1. Go to https://www.linkedin.com/developers/apps
2. Sign in with your LinkedIn account
3. Click on your application (or create a new one if needed)

### Step 2: Request Required Products

LinkedIn requires you to request access to specific "Products" to get certain scopes:

1. In your app dashboard, look for the **"Products"** tab
2. You need to request these products:

   **Required Products:**
   - ✅ **Sign In with LinkedIn using OpenID Connect** (for `openid`, `profile`, `email`)
   - ✅ **Share on LinkedIn** (for `w_member_social`)
   - ✅ **Marketing Developer Platform** (for `r_organization_admin`, `w_organization_social`)

3. Click **"Request access"** for each product
4. Fill out any required forms (LinkedIn may ask about your use case)

### Step 3: Wait for Approval (if required)

- **Sign In with LinkedIn**: Usually instant approval
- **Share on LinkedIn**: Usually instant approval
- **Marketing Developer Platform**: May require manual review (1-2 business days)

### Step 4: Verify Scopes in Auth Tab

1. Go to the **"Auth"** tab in your LinkedIn app
2. Scroll to **"OAuth 2.0 scopes"**
3. Verify these scopes are listed and checked:
   - `openid`
   - `profile`
   - `email`
   - `w_member_social`
   - `r_organization_admin`
   - `w_organization_social`

### Step 5: Update Redirect URLs

While you're in the Auth tab, verify:

1. **Redirect URLs** includes: `https://your-domain.vercel.app/api/accounts/linkedin/callback`
2. **OAuth 2.0 settings** → **Client ID** and **Client Secret** match your Vercel env vars

## 🔄 Alternative: Use Minimal Scopes (Temporary Workaround)

If you can't get `w_organization_social` approved immediately, you can temporarily use a reduced scope set for personal posting only:

### Option A: Personal Profile Posting Only

**Change line 86 in [`app/api/accounts/linkedin/connect/route.ts`](app/api/accounts/linkedin/connect/route.ts:86):**

```typescript
// OLD (requires Marketing Developer Platform):
authUrl.searchParams.set('scope', 'openid profile email w_member_social r_organization_admin w_organization_social')

// NEW (personal posting only - no Company Pages):
authUrl.searchParams.set('scope', 'openid profile email w_member_social')
```

**Limitations:**
- ❌ Cannot post to Company Pages
- ✅ Can post to personal LinkedIn profile
- ✅ No approval needed (instant)

### Option B: Read-Only Organization Access

```typescript
// For testing organization listing without posting:
authUrl.searchParams.set('scope', 'openid profile email r_organization_admin')
```

**Limitations:**
- ❌ Cannot post at all
- ✅ Can list Company Pages user manages
- ✅ Faster approval process

## 📊 Recommended Approach

### For Production (Full Features):

1. **Request Marketing Developer Platform** access in LinkedIn Developer Portal
2. **Wait for approval** (usually 1-2 business days)
3. **Keep current scopes** in code
4. **Test after approval**

### For Testing (Immediate):

1. **Temporarily reduce scopes** to `openid profile email w_member_social`
2. **Test personal profile posting** (not Company Pages)
3. **Upgrade scopes** once Marketing Developer Platform is approved

## 🛠️ Implementation Steps

### Immediate Action (Choose One):

**Option 1: Wait for LinkedIn Approval (Recommended)**
1. Request "Marketing Developer Platform" product in LinkedIn Developer Portal
2. Wait for approval email
3. No code changes needed
4. Test after approval

**Option 2: Temporary Workaround (Quick Test)**
1. Switch to Code mode
2. Update scope in [`app/api/accounts/linkedin/connect/route.ts`](app/api/accounts/linkedin/connect/route.ts:86)
3. Change to: `'openid profile email w_member_social'`
4. Test with personal profile posting
5. Revert to full scopes after Marketing Developer Platform approval

## 📝 Detailed LinkedIn Developer Portal Setup

### Creating a New LinkedIn App (if needed):

1. **Go to**: https://www.linkedin.com/developers/apps
2. **Click**: "Create app"
3. **Fill in**:
   - App name: "Agent X" (or your app name)
   - LinkedIn Page: Select your company page (or create one)
   - App logo: Upload a logo (optional)
   - Legal agreement: Check the box
4. **Click**: "Create app"

### Configuring OAuth Settings:

1. **Go to**: Auth tab
2. **Redirect URLs**: Add `https://your-domain.vercel.app/api/accounts/linkedin/callback`
3. **Copy**: Client ID → Add to Vercel as `LINKEDIN_CLIENT_ID`
4. **Generate**: Client Secret → Add to Vercel as `LINKEDIN_CLIENT_SECRET`

### Requesting Products:

1. **Go to**: Products tab
2. **Find**: "Sign In with LinkedIn using OpenID Connect"
   - Click "Request access"
   - Should be approved instantly
3. **Find**: "Share on LinkedIn"
   - Click "Request access"
   - Should be approved instantly
4. **Find**: "Marketing Developer Platform"
   - Click "Request access"
   - Fill out the form:
     - **Use case**: "Social media management and content scheduling"
     - **Description**: "Agent X is a social media automation tool that helps users schedule and publish content to their LinkedIn Company Pages"
   - Submit and wait for approval

### Verifying Scopes:

1. **Go to**: Auth tab
2. **Scroll to**: "OAuth 2.0 scopes"
3. **Verify**: All required scopes are listed
4. **If missing**: Go back to Products tab and ensure all products are approved

## 🔍 Debugging Scope Issues

### Check Current Scopes in LinkedIn Portal:

1. LinkedIn Developer Portal → Your App → Auth tab
2. Look for "OAuth 2.0 scopes" section
3. Compare with required scopes list above

### Check Which Products Are Approved:

1. LinkedIn Developer Portal → Your App → Products tab
2. Look for "Added products" section
3. Ensure all three products are listed

### Test Scope Authorization:

You can test which scopes are actually authorized by checking the LinkedIn authorization URL:

1. Click "Connect LinkedIn" in your app
2. Look at the URL LinkedIn redirects you to
3. Find the `scope=` parameter
4. Compare with what LinkedIn shows on the authorization screen

## ⚠️ Common Issues

### Issue 1: "Marketing Developer Platform" Not Available

**Symptom**: Can't find "Marketing Developer Platform" in Products tab

**Solution**: 
- Ensure your LinkedIn account has a Company Page
- Some regions may have restrictions
- Try creating a Company Page first

### Issue 2: Application Stuck in Review

**Symptom**: "Marketing Developer Platform" shows "In review" for days

**Solution**:
- Check your email for LinkedIn requests for more information
- Respond promptly to any LinkedIn emails
- Typical review time: 1-3 business days
- If stuck >5 days, contact LinkedIn Developer Support

### Issue 3: Scopes Not Showing After Product Approval

**Symptom**: Product approved but scopes still not available

**Solution**:
- Refresh the page
- Log out and log back in to LinkedIn Developer Portal
- Wait 5-10 minutes for changes to propagate
- Check Auth tab → OAuth 2.0 scopes section

## 📋 Verification Checklist

Before testing LinkedIn OAuth:

- [ ] LinkedIn app created in Developer Portal
- [ ] "Sign In with LinkedIn using OpenID Connect" product added
- [ ] "Share on LinkedIn" product added
- [ ] "Marketing Developer Platform" product added (or in review)
- [ ] Redirect URL configured: `https://your-domain.vercel.app/api/accounts/linkedin/callback`
- [ ] Client ID copied to Vercel as `LINKEDIN_CLIENT_ID`
- [ ] Client Secret copied to Vercel as `LINKEDIN_CLIENT_SECRET`
- [ ] Redirect URI set in Vercel as `LINKEDIN_REDIRECT_URI`
- [ ] `NEXT_PUBLIC_SITE_URL` set in Vercel with `https://`
- [ ] All scopes visible in Auth tab → OAuth 2.0 scopes
- [ ] Application redeployed in Vercel

## 🎯 Expected Timeline

### Instant (No Approval Needed):
- Sign In with LinkedIn using OpenID Connect
- Share on LinkedIn
- Scopes: `openid`, `profile`, `email`, `w_member_social`

### 1-3 Business Days (Requires Approval):
- Marketing Developer Platform
- Scopes: `r_organization_admin`, `w_organization_social`

## 🚀 Next Steps

1. **Go to LinkedIn Developer Portal** → Products tab
2. **Request "Marketing Developer Platform"** access
3. **While waiting**, you can:
   - Test with reduced scopes (personal posting only)
   - Set up other environment variables
   - Prepare Company Page for posting
4. **After approval**, test full OAuth flow with Company Pages

## 📞 Need Help?

If you're stuck:
- LinkedIn Developer Support: https://www.linkedin.com/help/linkedin/ask/api
- Check LinkedIn Developer Forums
- Review LinkedIn API documentation: https://learn.microsoft.com/en-us/linkedin/

---

**Summary**: The scope error is because your LinkedIn app needs "Marketing Developer Platform" product approval. Request it in the LinkedIn Developer Portal, and you should get approval within 1-3 business days.
