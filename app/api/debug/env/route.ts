import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * TEMPORARY DEBUG ENDPOINT
 * Shows environment variable status for debugging
 * DELETE THIS FILE after debugging is complete
 */
export async function GET() {
  const claudeKey = process.env.CLAUDE_API_KEY
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    runtime: 'nodejs',
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL: process.env.VERCEL || 'not set',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
    },
    claudeApiKey: {
      exists: !!claudeKey,
      length: claudeKey?.length || 0,
      prefix: claudeKey?.substring(0, 15) || 'NONE',
      type: typeof claudeKey,
    },
    allEnvKeys: Object.keys(process.env)
      .filter(k => k.includes('CLAUDE') || k.includes('API') || k.includes('SUPABASE') || k.includes('VERCEL'))
      .sort(),
  })
}

