# Agent X - Complete Setup & Deployment Guide

## 🎯 What is Agent X?

Agent X is a **fully autonomous AI-driven social media automation system**. Once configured and enabled, it operates **independently** without user interaction:

- **AI decides** what topics to post about
- **Code executes** content generation and publishing
- **System learns** from engagement metrics
- **Runs indefinitely** via cron jobs

This is NOT a chatbot. It's an AI-orchestrated workflow engine.

---

## 📋 System Architecture

### 4 Control Panels (User Configuration):

1. **Accounts** - Connect X (OAuth 1.0a), Telegram (Bot Token), and LinkedIn (OAuth 2.0)
2. **Settings** - Configure topics, tone, posting preferences
3. **Training** - Define Agent X constitution (brand voice, topics, guidelines)
4. **Schedule** - Set posting frequency, days, times

**Note**: AI is powered by a built-in Claude API key (server-side only). Users do NOT need to provide their own AI keys.

### 1 Autonomous Loop:

- **API Route**: `POST /api/autopilot/run`
- **Trigger**: Supabase cron (hourly)
- **Flow**:
  1. Check if autopilot is ON
  2. Check schedule (is it time to post?)
  3. Select topic intelligently (avoid repetition)
  4. Generate content using AI + training instructions
  5. Validate output
  6. Publish to all connected accounts
  7. Log results
  8. Exit

---

## 🚀 Deployment Steps

### Step 1: Environment Variables

Add these to Vercel:

```env
# Supabase (from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Token Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY=your-64-char-hex-key

# Claude API Key (for AI content generation) - REQUIRED
CLAUDE_API_KEY=your-anthropic-api-key

# LinkedIn OAuth (for Company Page posting)
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=https://your-domain.vercel.app/api/accounts/linkedin/callback
```

⚠️ **Important Notes**:
- **CLAUDE_API_KEY is REQUIRED** for Agent X to generate posts
- **X OAuth credentials are NOT needed** - users provide their own OAuth 1.0a keys manually
- **LinkedIn OAuth is optional** - only needed if users want to post to Company Pages
- Get your Claude API key from: https://console.anthropic.com/
- Get LinkedIn OAuth credentials from: https://www.linkedin.com/developers/apps

### Step 2: Deploy to Vercel

```bash
git push origin main
# Vercel auto-deploys if connected
```

Or manually:
```bash
vercel --prod
```

### Step 3: Set Up Supabase Cron Job

Agent X requires a cron job to trigger the autopilot loop.

#### Option A: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → Database → Functions
2. Create a new function:

```sql
-- Create cron job trigger function
CREATE OR REPLACE FUNCTION trigger_agent_x_autopilot()
RETURNS void AS $$
BEGIN
  -- Call Vercel API route via pg_net extension
  PERFORM
    net.http_post(
      url := 'https://your-app.vercel.app/api/autopilot/run',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule cron job (hourly at minute 0)
SELECT cron.schedule(
  'agent-x-autopilot',
  '0 * * * *', -- Every hour at minute 0
  'SELECT trigger_agent_x_autopilot();'
);
```

3. Replace `your-app.vercel.app` with your actual Vercel URL

#### Option B: External Cron Service

Use services like:
- **Cron-job.org**
- **EasyCron**
- **GitHub Actions**

Schedule POST request to:
```
POST https://your-app.vercel.app/api/autopilot/run
```

Frequency: Every hour

---

## 👤 User Setup Flow

Once deployed, users must complete these steps:

### 1. Sign Up / Log In

Navigate to `/login` and create an account (Supabase Auth).

### 2. Connect Accounts

Go to **Accounts** page:

#### X (Twitter):
1. Click "Connect X (Manual)"
2. Get OAuth 1.0a credentials from X Developer Portal:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret
3. Paste all 4 credentials
4. System validates and stores encrypted

#### Telegram:
1. Click "Connect Telegram"
2. Get Bot Token from @BotFather
3. Add bot as admin to your channel
4. Enter Bot Token and Channel @username
5. System validates bot permissions

### 3. Configure Settings

Go to **Settings**:

1. Verify AI status shows "Powered by Claude" (green indicator)
2. Add topics (e.g., "AI automation", "developer tools")
3. Set tone (e.g., "professional")
4. Save

**Note**: AI is pre-configured with Claude 3.5 Sonnet. No API key setup required from users.

### 4. Define Training Instructions

Go to **Training**:

1. Enter detailed instructions in the textarea
2. Include:
   - Brand voice and tone
   - Topics to emphasize
   - Topics to avoid
   - Posting style guidelines
   - Any constraints (character limits, formatting, etc.)

Example:
```
Brand Voice:
- Professional yet approachable
- Data-driven with practical insights
- Avoid jargon, explain complex topics simply

Topics to Emphasize:
- AI automation and productivity
- Developer tools and workflows
- Tech industry trends

Topics to Avoid:
- Political commentary
- Controversial social issues

Posting Style:
- Start with a hook or question
- Use specific examples
- Keep under 280 characters for X
```

3. Save training instructions

### 5. Set Schedule

Go to **Schedule**:

1. Select frequency (Daily, Weekly, Monthly)
2. Choose days of week (Monday, Tuesday, etc.)
3. Add posting times (e.g., 09:00, 14:00)
4. Save schedule

### 6. Enable Autopilot

1. Toggle **Autopilot** switch in top-right header
2. Switch turns GREEN = Autopilot ON
3. System will now post automatically according to schedule

---

## ✅ Success Conditions

Once autopilot is enabled:

✅ User configures accounts, AI, training, schedule **once**
✅ User flips autopilot **ON**
✅ Agent X posts **automatically** without input
✅ Post history updates in **Posts** page
✅ System can run **indefinitely**

---

## 📊 Monitoring & Logs

### Posts Page

View all generated and published posts:
- Status (draft, published, failed)
- Topic
- Content
- Platform (X, Telegram)
- Timestamp
- AI model used

### Pipeline Logs (Database)

Check `pipeline_logs` table for:
- Planning step (topic selection)
- Generation step (AI content creation)
- Publishing step (posting to platforms)
- Errors and warnings

Query example:
```sql
SELECT * FROM pipeline_logs
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔧 Troubleshooting

### Autopilot not posting

**Check:**
1. Is autopilot toggle ON?
2. Is schedule configured correctly?
3. Are accounts connected and active?
4. Is AI API key valid?
5. Is cron job running? (Check Supabase logs)

**Debug:**
- Check `pipeline_logs` table for errors
- Manually trigger: `POST /api/autopilot/run` (requires auth)
- Check Vercel function logs

### "No topics configured" error

- Go to Settings
- Add at least 1 topic
- Save settings

### "AI provider not configured" error

- Go to Settings
- Select AI provider
- Paste API key
- Select default model
- Save

### Posts failing to publish

**X:**
- Verify all 4 OAuth 1.0a credentials are correct
- Check X app has "Read and write" permissions
- Check X API rate limits

**Telegram:**
- Verify bot is still admin in channel
- Check bot token is valid
- Ensure channel username is correct

### Training instructions not being used

- Training instructions are automatically injected into prompts
- Check generation_prompt in posts table to verify
- If not present, re-save training instructions

---

## 🎨 Customization

### Change Posting Frequency

Go to **Schedule** → Update frequency/days/times → Save

### Update Training Instructions

Go to **Training** → Edit instructions → Save

### Change AI Model

Go to **Settings** → Select different provider/model → Save

### Add/Remove Topics

Go to **Settings** → Add or remove topics → Save

---

## 🔒 Security Notes

✅ **What we do:**
- Encrypt all credentials (AES-256-GCM)
- Store encryption key in environment variable only
- Never expose tokens/keys to frontend
- Use OAuth 1.0a request signing for X
- Row-level security on all database tables

❌ **What we DON'T store:**
- User passwords for social accounts
- Unencrypted API keys
- Unencrypted OAuth tokens

---

## 📝 Database Schema

Key tables created by Agent X:

```sql
-- User configuration
user_profiles (id, ai_provider, ai_api_key, default_model, training_instructions, autopilot_enabled, topics, tone, posting_frequency)

-- Connected social accounts
connected_accounts (id, user_id, platform, access_token, username, is_active)

-- Posts and history
posts (id, user_id, account_id, status, content, platform, topic, published_at, generation_model)

-- Scheduling
schedule_config (id, user_id, days_of_week, times, frequency)

-- Monitoring
pipeline_logs (id, user_id, step, status, message, metadata)
post_metrics (id, post_id, likes, retweets, views)
learning_data (id, user_id, account_id, best_time_of_day, best_format, avg_engagement)
```

---

## 🚦 System Status Indicators

### Autopilot Toggle

- **GREEN (ON)**: System is autonomous, posts automatically
- **GRAY (OFF)**: System is paused, no automatic posts

### Post Status

- **draft**: Content generated, not published
- **scheduled**: Queued for publishing
- **published**: Successfully posted to platform
- **failed**: Publishing failed (check logs)

---

## 📚 API Routes Reference

### Configuration
- `GET/POST /api/settings` - AI models, topics, tone
- `GET/POST /api/training` - Training instructions
- `GET/POST /api/schedule` - Posting schedule
- `GET /api/accounts` - List connected accounts
- `POST /api/accounts/x/manual-connect` - Connect X account
- `POST /api/accounts/connect` - Connect Telegram (POST)
- `POST /api/accounts/disconnect` - Disconnect account

### Autopilot
- `GET /api/autopilot/status` - Get autopilot status
- `POST /api/autopilot/toggle` - Enable/disable autopilot
- `POST /api/autopilot/run` - **Main autonomous loop** (cron-triggered)

### Posts & Metrics
- `GET /api/posts` - List posts
- `POST /api/posts/generate` - Manual generation
- `GET /api/metrics` - Engagement metrics
- `POST /api/metrics/collect` - Collect metrics (cron)

---

## 🎯 Success Checklist

Before enabling autopilot, verify:

- [ ] Supabase database migrated (tables created)
- [ ] Environment variables set in Vercel
- [ ] App deployed to Vercel
- [ ] Cron job configured (Supabase or external)
- [ ] User account created
- [ ] At least 1 social account connected (X or Telegram)
- [ ] AI provider configured with valid API key
- [ ] At least 1 topic added
- [ ] Training instructions defined
- [ ] Schedule configured (days + times)
- [ ] Autopilot toggle switched ON

---

## 🆘 Support

If you encounter issues:

1. Check `pipeline_logs` table for errors
2. Verify all environment variables are set
3. Test cron job manually: `POST /api/autopilot/run`
4. Check Vercel function logs
5. Verify social account credentials are valid

---

**Agent X is now ready for autonomous operation! 🚀**

Once autopilot is ON, the system will:
- Select topics intelligently
- Generate content using AI
- Publish to connected platforms
- Learn from engagement
- Operate indefinitely without user interaction

Enjoy your autonomous AI social media agent!

