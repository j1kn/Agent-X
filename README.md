# Agent X

A private internal automation agent for social media content generation, scheduling, posting, and iterative improvement.

## Tech Stack

- **Frontend**: Next.js (App Router) with TypeScript
- **Backend**: Next.js API routes (Node runtime)
- **Auth & DB**: Supabase
- **Scheduling**: Supabase cron jobs
- **Deployment**: Vercel
- **AI Models**: Gemini (default), OpenAI, Anthropic (BYO API key)

## Features

- User authentication (Supabase Auth)
- Connect Telegram and X (Twitter) accounts via OAuth
- Configure posting intent (topics, tone, frequency)
- AI-powered content generation
- Automated scheduling and publishing
- Engagement metrics collection
- Learning loop for timing and format optimization

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See `.env.local.example` for required environment variables.

## Architecture

Agent X follows a deterministic pipeline:

1. **Planning** - Select topics and optimal posting times
2. **Generation** - Create content using AI models
3. **Scheduling** - Queue posts for future publishing
4. **Publishing** - Post to social platforms via cron
5. **Metrics Collection** - Gather engagement data
6. **Learning Loop** - Optimize timing and format (heuristic only)

## Deployment

This project is designed to be deployed on Vercel with Supabase as the database and cron scheduler.

All API routes use Node.js runtime for compatibility with AI SDKs and OAuth libraries.

## Security

- AI API keys are stored encrypted in Supabase and never exposed to the client
- All database access is protected by Row Level Security (RLS)
- Single-user system (no multi-tenant architecture)

## License

Private internal tool - not for public distribution.

