import { createServiceClient } from '@/lib/supabase/server'
import { getTelegramMetrics } from '@/lib/platforms/telegram'
import { getXMetrics } from '@/lib/platforms/x'
import type { Database } from '@/types/database'

export async function collectMetrics(): Promise<{
  collected: number
  errors: string[]
}> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let collected = 0

  // Query published posts from last 24 hours
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      connected_accounts (
        platform,
        access_token,
        username
      )
    `)
    .eq('status', 'published')
    .gte('published_at', twentyFourHoursAgo.toISOString())
    .not('platform_post_id', 'is', null)

  if (error) {
    errors.push(`Failed to query published posts: ${error.message}`)
    return { collected, errors }
  }

  if (!posts || posts.length === 0) {
    return { collected, errors }
  }

  // Collect metrics for each post
  for (const post of posts) {
    try {
      // @ts-expect-error - Post type inference issue
      const account = post.connected_accounts as any

      // @ts-expect-error - Post type inference issue
      if (!account || !post.platform_post_id) {
        continue
      }

      let metrics

      // Fetch metrics from platform
      if (account.platform === 'telegram') {
        metrics = await getTelegramMetrics(
          account.access_token,
          account.username,
          // @ts-expect-error - Post type inference issue
          post.platform_post_id
        )
      } else if (account.platform === 'x') {
        // @ts-expect-error - Post type inference issue
        metrics = await getXMetrics(account.access_token, post.platform_post_id)
      } else {
        continue
      }

      // Insert/update metrics
      const { error: metricsError } = await supabase
        .from('post_metrics')
        // @ts-expect-error - Supabase type inference issue with upsert
        .upsert({
          // @ts-expect-error - Post type inference issue
          post_id: post.id,
          // @ts-expect-error - Post type inference issue
          platform_post_id: post.platform_post_id,
          likes: metrics.likes,
          retweets: metrics.retweets,
          views: metrics.views,
          collected_at: new Date().toISOString(),
        }, {
          onConflict: 'post_id,collected_at'
        })

      if (metricsError) {
        // @ts-expect-error - Post type inference issue
        errors.push(`Post ${post.id}: ${metricsError.message}`)
        continue
      }

      // Log success
      // @ts-ignore - Supabase type inference issue
      await supabase.from('pipeline_logs').insert({
        // @ts-expect-error - Post type inference issue
        user_id: post.user_id,
        step: 'metrics',
        status: 'success',
        message: `Metrics collected for post`,
        // @ts-expect-error - Post type inference issue
        metadata: { post_id: post.id, metrics },
      })

      collected++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // @ts-expect-error - Post type inference issue
      errors.push(`Post ${post.id}: ${errorMessage}`)

      // @ts-ignore - Supabase type inference issue
      await supabase.from('pipeline_logs').insert({
        // @ts-expect-error - Post type inference issue
        user_id: post.user_id,
        step: 'metrics',
        status: 'error',
        message: `Failed to collect metrics: ${errorMessage}`,
        // @ts-expect-error - Post type inference issue
        metadata: { post_id: post.id, error: errorMessage },
      })
    }
  }

  return { collected, errors }
}

