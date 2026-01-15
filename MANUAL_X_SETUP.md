# Manual X (Twitter) Account Connection Setup

This guide explains how to set up manual X account connection using OAuth 1.0a credentials.

## Why Manual Connection?

- **Private/internal tool**: No need for public OAuth flows
- **Multi-user support**: Each user provides their own X API credentials
- **Full control**: Users manage their own API keys and tokens
- **No redirect flows**: Simple paste-and-connect UX

## Prerequisites

1. **X Developer Account**: https://developer.twitter.com/
2. **X Developer Project with App**: Create a project and app in the X Developer Portal
3. **OAuth 1.0a Credentials**: Enable "User authentication settings" and set up OAuth 1.0a

## Step 1: Get X API Credentials

### 1.1 Create X Developer App

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new Project (if you don't have one)
3. Create a new App within that project
4. Note down your **API Key** and **API Secret**

### 1.2 Enable User Authentication

1. In your App settings, go to "User authentication settings"
2. Set up OAuth 1.0a:
   - **App permissions**: Read and write
   - **Type of App**: Web App, Automated App or Bot
   - **Callback URI**: Not required for manual connection
   - **Website URL**: Your website or localhost
3. Save settings

### 1.3 Generate Access Token & Secret

1. In your App settings, go to "Keys and tokens" tab
2. Under "Authentication Tokens", generate:
   - **Access Token**
   - **Access Token Secret**
3. Save these credentials securely

You should now have 4 credentials:
- API Key
- API Secret
- Access Token
- Access Token Secret

## Step 2: Set Up Encryption Key

Generate a secure encryption key for storing credentials:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add this to your `.env.local`:

```env
TOKEN_ENCRYPTION_KEY=your-64-character-hex-key-here
```

**⚠️ CRITICAL**: Never commit this key to version control!

## Step 3: Connect X Account

1. Log into your Agent X app
2. Go to "Connected Accounts" page
3. Click "Connect X (Manual)"
4. Paste all 4 credentials:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret
5. Click "Connect"

The system will:
- Validate credentials by making a test API call
- Encrypt all 4 credentials using AES-256-GCM
- Store encrypted credentials in Supabase
- Associate credentials with your user account

## Step 4: Verify Connection

Once connected, you should see:
- ✅ X account connected
- Your X username displayed
- Ability to disconnect account

You can now use Agent X to post tweets automatically!

## Security Notes

✅ **What we do:**
- Encrypt credentials using AES-256-GCM before storage
- Store encryption key in environment variable only
- Decrypt credentials at runtime only when needed
- Never log or expose credentials in frontend
- Use OAuth 1.0a request signing for all API calls

❌ **What we DON'T do:**
- Store credentials in plain text
- Expose credentials to client-side JavaScript
- Share credentials between users
- Store credentials in environment variables (user-specific)

## Multi-User Support

Each user provides and manages their own X credentials:
- User A has their own X API credentials
- User B has their own X API credentials
- Agent X posts to each user's account using their respective credentials
- No credential sharing or cross-user access

## Troubleshooting

### "Invalid credentials" error

- Double-check all 4 credentials are correct
- Ensure your X app has "Read and write" permissions
- Verify Access Token & Secret are generated for the correct app
- Check if your X Developer account is in good standing

### "Failed to save credentials" error

- Verify `TOKEN_ENCRYPTION_KEY` is set in `.env.local`
- Check Supabase connection is working
- Ensure `connected_accounts` table exists

### Posts not appearing on X

- Check if your X app has "Read and write" permissions
- Verify OAuth 1.0a is properly configured
- Check X API rate limits
- Review X Developer Portal for any account restrictions

## FAQ

**Q: Do I need OAuth 2.0 setup?**
A: No. Manual connection uses OAuth 1.0a credentials only.

**Q: Can multiple team members use the same X account?**
A: Yes, but each person must enter the same 4 credentials. It's better for each person to use their own X account.

**Q: Are credentials encrypted?**
A: Yes, using AES-256-GCM with a secure encryption key.

**Q: What happens if TOKEN_ENCRYPTION_KEY is lost?**
A: All stored credentials become unrecoverable. Users must re-connect their accounts.

**Q: Can I rotate the encryption key?**
A: Not easily. You'd need to decrypt all credentials with the old key and re-encrypt with the new key.

## Resources

- X API Documentation: https://developer.twitter.com/en/docs/twitter-api
- OAuth 1.0a Spec: https://oauth.net/core/1.0a/
- X Developer Portal: https://developer.twitter.com/en/portal/dashboard


