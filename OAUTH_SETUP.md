# OAuth Setup Guide

## X (Twitter) OAuth 2.0 Setup

### 1. Create Twitter Developer Account
1. Go to https://developer.twitter.com/
2. Sign in and apply for a developer account
3. Create a new project and app

### 2. Configure OAuth 2.0
1. In your app settings, go to "User authentication settings"
2. Enable OAuth 2.0
3. Set **Type of App**: Web App
4. Set **App permissions**: Read and Write
5. Add **Callback URLs**:
   - For local development: `http://localhost:3000/api/accounts/callback/x`
   - For production: `https://yourdomain.com/api/accounts/callback/x`
6. Add **Website URL**: Your app's homepage

### 3. Get Credentials
1. Copy your **Client ID**
2. Generate and copy your **Client Secret**
3. Add to Vercel environment variables:
   ```
   X_CLIENT_ID=your-client-id-here
   X_CLIENT_SECRET=your-client-secret-here
   ```

### Required Scopes
- `tweet.write` - To post tweets
- `users.read` - To get user info
- `offline.access` - For refresh tokens

---

## Telegram Bot Setup

### 1. Create a Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts:
   - Choose a display name (e.g., "My Agent X Bot")
   - Choose a username (must end in "bot", e.g., "myagentx_bot")
4. Copy the **Bot Token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Create/Prepare a Channel
1. Create a new Telegram channel or use an existing one
2. Make sure the channel has a **username** (set in channel settings)
3. Add your bot as an **administrator** to the channel:
   - Go to channel settings → Administrators
   - Click "Add Administrator"
   - Search for your bot by username
   - Grant "Post Messages" permission

### 3. Connect in Agent X
1. Click "Connect Telegram" in Agent X
2. Paste your **Bot Token**
3. Enter your **Channel Username** (with or without @)
4. Click "Connect"

Agent X will:
- Verify the bot token is valid
- Check that the bot can access the channel
- Confirm the bot has admin permissions
- Save the connection

### No Server Configuration Needed
Unlike X OAuth, Telegram doesn't require any server-side environment variables. Users provide their bot tokens directly through the UI, and Agent X verifies and stores them securely.

---

## Security Notes

### ✅ What Agent X Does
- Stores all tokens **encrypted** in Supabase
- **Never** exposes tokens to the client
- Uses **PKCE** for X OAuth (industry standard)
- Verifies bot permissions before storing

### ❌ What Agent X Never Does
- Never asks for passwords
- Never stores unencrypted credentials
- Never logs sensitive tokens
- Never shares tokens between users

---

## Testing Your Connection

### X (Twitter)
1. Click "Connect X (Twitter)"
2. You'll be redirected to Twitter
3. Authorize the app
4. You'll be redirected back to Agent X
5. Connection appears in your accounts list

### Telegram
1. Click "Connect Telegram"
2. Enter bot token and channel username
3. Click "Connect"
4. If successful, connection appears immediately
5. If failed, check:
   - Bot token is correct
   - Channel username is correct
   - Bot is added as admin to the channel
   - Bot has "Post Messages" permission

---

## Troubleshooting

### X Connection Fails
- **"Invalid credentials"**: Check X_CLIENT_ID and X_CLIENT_SECRET in Vercel
- **"Redirect URI mismatch"**: Ensure callback URL is added in Twitter app settings
- **"Insufficient permissions"**: Make sure app has Read and Write permissions

### Telegram Connection Fails
- **"Invalid bot token"**: Double-check the token from @BotFather
- **"Cannot access channel"**: Verify channel username is correct
- **"Bot must be administrator"**: Add bot to channel administrators
- **"Bot needs permissions"**: Grant "Post Messages" permission to bot

---

## Environment Variables Summary

Add these to your Vercel project:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# X OAuth (required for X connection)
X_CLIENT_ID=xxx
X_CLIENT_SECRET=xxx

# No Telegram vars needed - users provide bot tokens
```

