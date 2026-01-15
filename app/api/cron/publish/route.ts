import { NextResponse } from 'next/server'
import { publishScheduledPosts } from '@/lib/pipeline/publisher'

export const runtime = 'nodejs'

/**
 * Cron Publish Endpoint
 * 
 * Publishes all scheduled posts that are due.
 * Safe to call repeatedly (idempotent) - uses row locking to prevent duplicates.
 * 
 * Can be triggered by:
 * - Vercel Cron (vercel.json)
 * - Supabase Edge Scheduler
 * - Manual trigger
 * - External monitoring services
 * 
 * No authentication required for cron endpoint (can add optional secret validation)
 */
export async function GET() {
  try {
    console.log('[Cron Publish] Starting scheduled post publication')
    
    const result = await publishScheduledPosts()
    
    console.log('[Cron Publish] Completed:', result)
    
    return NextResponse.json({
      success: true,
      published: result.published,
      failed: result.failed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('[Cron Publish] Fatal error:', errorMessage)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

/**
 * POST endpoint for manual triggering
 */
export async function POST() {
  return GET() // Same logic, just allows POST requests too
}

