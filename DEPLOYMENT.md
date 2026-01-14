# Deployment Guide for Agent X

## Prerequisites

1. **Supabase Project** - Already set up with tables created
2. **Vercel Account** - For hosting
3. **Platform Credentials**:
   - Telegram Bot Token & Username
   - X (Twitter) API credentials (Client ID, Client Secret)
4. **AI Model API Key** - Gemini, OpenAI, or Anthropic

## Environment Variables

Configure these in Vercel:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OAuth (Telegram Bot)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=your-telegram-bot-username

# OAuth (X/Twitter)
X_CLIENT_ID=your-x-client-id
X_CLIENT_SECRET=your-x-client-secret
X_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/accounts/callback/x

# Auto-set by Vercel
VERCEL_URL=
```

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
   - AI Provider (Gemini, OpenAI, or Anthropic)
   - AI API Key
   - Topics
   - Tone
   - Posting Frequency
3. Go to Accounts and connect:
   - Telegram account
   - X (Twitter) account
4. Go to Dashboard and click "Generate Post"
5. Check Posts page to see scheduled posts
6. Wait for cron to publish (or manually trigger)
7. Check Metrics page after posts are published

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

- AI API keys are stored encrypted in Supabase (server-only)
- Service role key should never be exposed to the client
- Row Level Security (RLS) is enabled on all tables
- OAuth tokens are stored encrypted

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

- [ ] All environment variables set in Vercel
- [ ] Supabase cron jobs configured
- [ ] Test user account created
- [ ] AI API key configured
- [ ] Platform accounts connected
- [ ] Test post generated and published
- [ ] Metrics collecting successfully
- [ ] Learning loop running daily
- [ ] Monitoring and alerts set up (optional)

## Next Steps

1. Monitor the system for a few days
2. Review metrics and learning data
3. Adjust topics and tone based on performance
4. Consider adding more platforms (future)

