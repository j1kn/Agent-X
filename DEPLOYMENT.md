# Deployment Guide for Agent X

## Prerequisites

1. **Supabase Project** - Already set up with tables created
2. **Vercel Account** - For hosting
3. **Claude API Key** - From Anthropic (https://console.anthropic.com/)
4. **Platform Credentials**:
   - Users will provide their own X OAuth 1.0a credentials
   - Users will provide their own Telegram Bot Token

## Environment Variables

Configure these in Vercel:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Token Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY=your-64-char-hex-key

# Claude API Key (REQUIRED for AI content generation)
CLAUDE_API_KEY=your-anthropic-api-key

# LinkedIn OAuth (OPTIONAL - for Company Page posting)
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=https://your-domain.vercel.app/api/accounts/linkedin/callback

# Auto-set by Vercel
VERCEL_URL=
```

**Important Notes**:
- **CLAUDE_API_KEY is REQUIRED** - All AI generation uses Claude 3.5 Sonnet
- Get your Claude key from: https://console.anthropic.com/
- **LinkedIn OAuth is OPTIONAL** - Only needed for LinkedIn Company Page posting
- Create LinkedIn app at: https://www.linkedin.com/developers/apps
- Users do NOT need to provide their own AI keys
- X and Telegram credentials are entered by users in the app (not env vars)

## Deployment Steps

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

Or use the Vercel Dashboard:
1. Connect your GitHub repository
2. Set environment variables
3. Deploy

### 2. Configure Supabase Cron Jobs

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 1. Publish Scheduled Posts (every 5 minutes)
SELECT cron.schedule(
  'publish-posts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/pipeline/publish',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 2. Collect Metrics (every hour)
SELECT cron.schedule(
  'collect-metrics',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/metrics/collect',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 3. Learning Loop (daily at 2 AM)
SELECT cron.schedule(
  'learning-loop',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/pipeline/learn',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

Replace:
- `YOUR-VERCEL-DOMAIN` with your actual Vercel domain
- `YOUR-SERVICE-ROLE-KEY` with your Supabase service role key

### 3. Verify Cron Jobs

Check that cron jobs are scheduled:

```sql
SELECT * FROM cron.job;
```

### 4. Test the System

1. Sign up / Log in at `https://your-domain.vercel.app`
2. Go to Settings and configure:
   - Verify "Powered by Claude" status is green
   - Add topics
   - Set tone
   - Save
3. Go to Accounts and connect:
   - X account (enter OAuth 1.0a credentials manually)
   - Telegram account (enter bot token and channel)
   - LinkedIn Company Page (OAuth 2.0 flow - optional)
4. Go to Schedule and set posting times
5. Turn on Autopilot in the top nav
6. Agent X will now post automatically to all connected platforms at scheduled times

## Manual Cron Testing

You can manually trigger cron jobs for testing:

```bash
# Publish posts
curl -X POST https://your-domain.vercel.app/api/pipeline/publish \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY"

# Collect metrics
curl -X POST https://your-domain.vercel.app/api/metrics/collect \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY"

# Update learning data
curl -X POST https://your-domain.vercel.app/api/pipeline/learn \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY"
```

## Troubleshooting

### Cron Jobs Not Running

Check Supabase logs:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Posts Not Publishing

1. Check `pipeline_logs` table for errors
2. Verify platform credentials are correct
3. Check that posts are in 'scheduled' status with `scheduled_for` in the past

### Metrics Not Collecting

1. Verify X API access token is valid
2. Check that posts have `platform_post_id` set
3. Review `pipeline_logs` for error messages

## Security Notes

- Claude API key is stored in Vercel env vars (server-only, never exposed to client)
- User social media credentials (X OAuth 1.0a, Telegram bot tokens) are encrypted with AES-256-GCM
- Service role key should never be exposed to the client
- Row Level Security (RLS) is enabled on all tables for multi-user support
- All AI generation happens server-side with built-in Claude key

## Maintenance

### View Logs

```sql
-- Pipeline logs
SELECT * FROM pipeline_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- Failed posts
SELECT * FROM posts 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

### Reset a Failed Post

```sql
UPDATE posts 
SET status = 'scheduled' 
WHERE id = 'post-id-here';
```

### Pause Cron Jobs

```sql
-- Disable a specific job
SELECT cron.unschedule('publish-posts');

-- Re-enable
-- Run the cron.schedule command again
```

## Production Checklist

- [ ] All environment variables set in Vercel (including CLAUDE_API_KEY)
- [ ] Supabase cron jobs configured
- [ ] Test user account created
- [ ] Claude API key verified (check Settings page shows green status)
- [ ] Platform accounts connected (X OAuth 1.0a + Telegram bot)
- [ ] Test post generated and published
- [ ] Autopilot enabled and running
- [ ] Monitoring and alerts set up (optional)

## Next Steps

1. Monitor the system for a few days
2. Review metrics and learning data
3. Adjust topics and tone based on performance
4. Consider adding more platforms (future)

