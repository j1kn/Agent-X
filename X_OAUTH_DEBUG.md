# X OAuth 2.0 Debugging Guide - Consent Screen Issue

## Problem: Login Shows But No Consent Screen

If users see the X login page but never see the authorization/consent screen, follow this debugging checklist.

---

## ✅ Pre-Flight Checklist

### 1. Verify X Developer Portal Configuration

**Go to:** https://developer.twitter.com/en/portal/projects-and-apps

**Check these settings:**

- [ ] **App Type**: Is it "Web App, Automated App or Bot"?
- [ ] **OAuth 2.0 is ENABLED** (not OAuth 1.0a)
- [ ] **App permissions**: Set to "Read and Write"
- [ ] **Callback URLs** include your exact redirect URI:
  - Local: `http://localhost:3000/api/accounts/callback/x`
  - Production: `https://yourdomain.com/api/accounts/callback/x`
  - ⚠️ MUST match exactly - trailing slash matters!
- [ ] **Website URL** is set
- [ ] App is **NOT in "Testing" mode** (or test user is added)

### 2. Verify Environment Variables

**In Vercel Dashboard → Settings → Environment Variables:**

```bash
X_CLIENT_ID=your-client-id         # From X Developer Portal
X_CLIENT_SECRET=your-client-secret # From X Developer Portal
```

**To verify locally:**
```bash
echo $X_CLIENT_ID        # Should output your client ID
echo $X_CLIENT_SECRET    # Should output your client secret
```

### 3. Check Authorize URL

**Expected Format:**
```
https://twitter.com/i/oauth2/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https%3A%2F%2Fyourdomain.com%2Fapi%2Faccounts%2Fcallback%2Fx&
  scope=tweet.write%20users.read%20offline.access&
  state=RANDOM_STATE&
  code_challenge=RANDOM_CHALLENGE&
  code_challenge_method=S256
```

**Verify in Logs (Vercel → Deployment → Functions):**

Look for console output:
```
=== X OAuth 2.0 Authorize URL ===
Full URL: https://twitter.com/i/oauth2/authorize?...
Parameters:
  - response_type: code
  - client_id: AbCdEf...
  - redirect_uri: https://yourdomain.com/api/accounts/callback/x
  - scope: tweet.write users.read offline.access
  - state: XyZ123...
  - code_challenge: a1B2c3...
  - code_challenge_method: S256
================================
```

**Critical checks:**
- [ ] `response_type` is `code` (not `token`)
- [ ] `scope` has spaces (not commas): `tweet.write users.read offline.access`
- [ ] `code_challenge` is present and ~43 characters
- [ ] `code_challenge_method` is `S256`
- [ ] `redirect_uri` is URL-encoded and matches portal exactly

---

## 🐛 Common Issues & Fixes

### Issue 1: "Invalid Client ID"

**Symptoms:** Error before even reaching login page

**Causes:**
- `X_CLIENT_ID` not set or incorrect
- Wrong Client ID (using OAuth 1.0a credentials)

**Fix:**
1. Go to X Developer Portal → Your App → Keys and tokens
2. Copy OAuth 2.0 Client ID (NOT API Key)
3. Update `X_CLIENT_ID` in Vercel
4. Redeploy

---

### Issue 2: "Redirect URI Mismatch"

**Symptoms:** Error after login, before consent

**Causes:**
- Callback URL in code doesn't match X Developer Portal
- Extra/missing trailing slash
- HTTP vs HTTPS mismatch
- Subdomain mismatch

**Fix:**
1. Check logs for `redirect_uri` value
2. Go to X Developer Portal → App Settings → User authentication settings
3. Ensure callback URL matches EXACTLY
4. Common mistakes:
   - ❌ `https://yourdomain.com/api/accounts/callback/x/`
   - ✅ `https://yourdomain.com/api/accounts/callback/x`

---

### Issue 3: "Invalid Scope"

**Symptoms:** Error or no consent screen

**Causes:**
- Scopes comma-separated instead of space-separated
- Typos in scope names
- Requesting scopes app doesn't have permission for

**Fix:**
1. Check logs for scope parameter
2. Must be EXACTLY: `tweet.write users.read offline.access`
3. Spaces between scopes (will be encoded as `%20`)
4. Verify in authorize URL: `scope=tweet.write%20users.read%20offline.access`

---

### Issue 4: "App in Testing Mode"

**Symptoms:** Works for you, not for others

**Causes:**
- App not approved for production use
- User not added to test users list

**Fix:**
1. Go to X Developer Portal → Your App
2. Check "App environment" status
3. Either:
   - Apply for "Elevated" access
   - OR add test users
   - OR use your own account for testing

---

### Issue 5: "PKCE Validation Failed"

**Symptoms:** Login works, consent works, but error during token exchange

**Causes:**
- `code_verifier` doesn't match `code_challenge`
- `code_verifier` not persisted correctly
- Wrong `code_challenge_method`

**Fix:**
1. Check logs for "Token Exchange Request"
2. Verify `code_verifier` length is 43-128 characters
3. Verify `code_challenge_method` is `S256`
4. Check database for `oauth_pkce_storage` entries
5. Ensure PKCE code isn't expired (>10 min)

---

## 📊 How to Read the Logs

### Step 1: Connect Request

Look for:
```
=== Initiating X OAuth 2.0 Flow ===
Redirect URI: https://yourdomain.com/api/accounts/callback/x
⚠️  VERIFY: This MUST match exactly in X Developer Portal
PKCE Generated:
  - code_verifier length: 43
  - code_challenge length: 43
State generated: XyZ123...
✅ PKCE code stored successfully
```

**What to check:**
- Redirect URI matches what you configured
- PKCE lengths are reasonable (40-45 chars)
- Storage succeeded

### Step 2: Authorize URL

Look for:
```
=== X OAuth 2.0 Authorize URL ===
Full URL: https://twitter.com/i/oauth2/authorize?...
Parameters:
  - response_type: code
  - client_id: AbCdEf...
  - redirect_uri: https://yourdomain.com/api/accounts/callback/x
  - scope: tweet.write users.read offline.access
  ...
```

**What to check:**
- All 7 required parameters present
- Scope format correct (spaces, not commas)
- No typos in scope names

### Step 3: Callback Received

Look for:
```
=== X OAuth 2.0 Callback ===
✅ Code received: abcd1234...
✅ State received: XyZ123...
📥 Looking up PKCE code_verifier from database...
✅ PKCE code_verifier retrieved
```

**What to check:**
- Code and state both present (not error)
- PKCE lookup successful
- User ID correct

### Step 4: Token Exchange

Look for:
```
=== Token Exchange Request ===
Endpoint: https://api.twitter.com/2/oauth2/token
Grant type: authorization_code
...
Response status: 200 OK
✅ Token exchange successful!
Access token received: Yes
Refresh token received: Yes
```

**What to check:**
- Status 200 (not 400/401)
- Both tokens received
- No error messages

---

## 🔧 Testing Flow

### Manual Test

1. **Click "Connect X (Twitter)"**
2. **Check browser console** → Network tab
3. **Verify redirect** to `https://twitter.com/i/oauth2/authorize?...`
4. **Copy the full URL** from address bar
5. **Decode the URL** using: https://www.urldecoder.org/
6. **Verify all parameters:**
   ```
   response_type=code
   client_id=[your_client_id]
   redirect_uri=https://yourdomain.com/api/accounts/callback/x
   scope=tweet.write users.read offline.access
   state=[random_string]
   code_challenge=[random_string]
   code_challenge_method=S256
   ```

### Automated Test

```bash
# Test the connect endpoint
curl -X POST https://yourdomain.com/api/accounts/connect \
  -H "Content-Type: application/json" \
  -d '{"platform":"x"}' \
  -H "Cookie: [your_session_cookie]"

# Should return:
# {"authUrl":"https://twitter.com/i/oauth2/authorize?..."}

# Then visit the authUrl in browser
```

---

## 🆘 Still Not Working?

### Check X API Status
- Visit: https://api.twitterstat.us/
- Verify OAuth services are operational

### Enable More Logging

Add to your code:
```typescript
// In connect route
console.log('ENV CHECK:', {
  clientIdPresent: !!process.env.X_CLIENT_ID,
  clientSecretPresent: !!process.env.X_CLIENT_SECRET,
  clientIdLength: process.env.X_CLIENT_ID?.length
})
```

### Common Last Resort Fixes

1. **Regenerate Client Secret**
   - Go to X Developer Portal
   - Regenerate Client Secret
   - Update in Vercel
   - Redeploy

2. **Create New App**
   - Sometimes X apps get into bad states
   - Create fresh app in X Developer Portal
   - Use new Client ID/Secret

3. **Check App Permissions**
   - Ensure app has "Read and Write" permissions
   - NOT "Read only"
   - May need to request elevated access

4. **Wait for Propagation**
   - Changes in X Developer Portal can take 5-10 minutes
   - Try again after waiting

---

## ✅ Success Indicators

When everything works correctly, you'll see:

1. **Click "Connect X"** → Redirect to X
2. **Login (if needed)** → Shows X login page
3. **Consent Screen** → Shows "Authorize app" with:
   - App name
   - Requested permissions
   - "Authorize app" button
4. **Redirect Back** → Returns to your app
5. **Success Message** → "X account connected successfully!"

**In logs:**
```
=== Initiating X OAuth 2.0 Flow ===
...
✅ PKCE code stored successfully
🚀 Returning authUrl to client
===================================

=== X OAuth 2.0 Callback ===
✅ Code received
✅ PKCE code_verifier retrieved
🔄 Exchanging authorization code for access token...
✅ Access token received
✅ Account connected successfully!
```

---

## 📞 Need More Help?

1. **Check Vercel logs**: Deployment → Functions → View logs
2. **Check browser console**: F12 → Console tab
3. **Check Network tab**: F12 → Network → Look for failed requests
4. **Copy full authorize URL**: Paste into decoder to inspect
5. **Check X Developer Portal**: Review all settings

If the consent screen still doesn't show after checking everything:
- The authorize URL parameters are likely malformed
- The redirect_uri probably doesn't match
- Or the app needs elevated X API access

