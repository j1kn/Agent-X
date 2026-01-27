import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchTelegramPostMetrics } from '@/lib/platforms/telegram'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for metrics collection

interface PostWithAccount {
  id: string
  user_id: string
  platform: string
  platform_post_id: string | null
  content: string
  published_at: string | null
  account_id: string
  connected_accounts: {
    access_token: string
    platform_user_id: string
  } | {
    access_token: string
    platform_user_id: string
  }[] | null
}

/**
 * POST /api/metrics/collect
 * Collects metrics for published posts from the last 7 days
 * This endpoint should be called by a cron job every 6 hours
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authorization (can be cron secret or user auth)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Check if request is from cron job
    const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`
    
    if (!isCronJob) {
      // If not cron, require user authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('[Metrics Collection] Starting metrics collection...')

    // Get all published Telegram posts from the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        platform,
        platform_post_id,
        content,
        published_at,
        account_id,
        connected_accounts!posts_account_id_fkey (
          access_token,
          platform_user_id
        )
      `)
      .eq('status', 'published')
      .eq('platform', 'telegram')
      .not('platform_post_id', 'is', null)
      .gte('published_at', sevenDaysAgo.toISOString())
      .order('published_at', { ascending: false })

    if (postsError) {
      console.error('[Metrics Collection] Error fetching posts:', postsError)
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    const typedPosts = posts as unknown as PostWithAccount[]

    if (!typedPosts || typedPosts.length === 0) {
      console.log('[Metrics Collection] No Telegram posts found to collect metrics for')
      return NextResponse.json({ 
        success: true, 
        message: 'No posts to collect metrics for',
        collected: 0 
      })
    }

    console.log(`[Metrics Collection] Found ${typedPosts.length} Telegram posts to collect metrics for`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Collect metrics for each post
    for (const post of typedPosts) {
      try {
        // Type guard for connected_accounts
        const account = Array.isArray(post.connected_accounts) 
          ? post.connected_accounts[0] 
          : post.connected_accounts

        if (!account) {
          console.warn(`[Metrics Collection] No connected account for post ${post.id}`)
          results.failed++
          results.errors.push(`Post ${post.id}: No connected account`)
          continue
        }

        const { access_token, platform_user_id } = account

        if (!access_token || !platform_user_id || !post.platform_post_id) {
          console.warn(`[Metrics Collection] Missing data for post ${post.id}`)
          results.failed++
          results.errors.push(`Post ${post.id}: Missing required data`)
          continue
        }

        console.log(`[Metrics Collection] Collecting metrics for post ${post.id}`)

        // Fetch metrics from Telegram
        const metrics = await fetchTelegramPostMetrics(
          access_token,
          platform_user_id,
          post.platform_post_id
        )

        // Calculate engagement score
        const engagementScore = 
          (metrics.views * 0.2) +
          (metrics.forwards * 3) +
          (metrics.reactions * 2) +
          (metrics.comments * 4)

        // Insert metrics snapshot
        const { error: insertError } = await supabase
          .from('post_metrics')
          .insert({
            post_id: post.id,
            platform_post_id: post.platform_post_id,
            platform: 'telegram',
            views: metrics.views,
            forwards: metrics.forwards,
            reactions: metrics.reactions,
            comments: metrics.comments,
            likes: 0, // Telegram doesn't have likes
            retweets: 0, // Using forwards instead
            engagement_score: engagementScore,
            collected_at: new Date().toISOString(),
          } as any)

        if (insertError) {
          console.error(`[Metrics Collection] Error inserting metrics for post ${post.id}:`, insertError)
          results.failed++
          results.errors.push(`Post ${post.id}: ${insertError.message}`)
        } else {
          console.log(`[Metrics Collection] Successfully collected metrics for post ${post.id}`)
          results.success++
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Metrics Collection] Error processing post ${post.id}:`, errorMessage)
        results.failed++
        results.errors.push(`Post ${post.id}: ${errorMessage}`)
      }
    }

    console.log('[Metrics Collection] Collection complete:', results)

    return NextResponse.json({
      success: true,
      message: 'Metrics collection completed',
      collected: results.success,
      failed: results.failed,
      total: typedPosts.length,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Metrics Collection] Fatal error:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to collect metrics', details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * GET /api/metrics/collect
 * Manually trigger metrics collection (requires authentication)
 */
export async function GET(request: Request) {
  // Forward to POST handler
  return POST(request)
}
