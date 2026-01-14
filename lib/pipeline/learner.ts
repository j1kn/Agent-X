import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export async function updateLearningData(): Promise<{
  updated: number
  errors: string[]
}> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let updated = 0

  // Get all users with published posts
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id')

  if (usersError || !users) {
    errors.push(`Failed to query users: ${usersError?.message}`)
    return { updated, errors }
  }

  // Process each user
  for (const user of users) {
    try {
      // Get user's connected accounts
      const { data: accounts } = await supabase
        .from('connected_accounts')
        .select('id, user_id')
        // @ts-expect-error - User type inference issue
        .eq('user_id', user.id)

      if (!accounts || accounts.length === 0) {
        continue
      }

      // Process each account
      for (const account of accounts) {
        try {
          // Get posts with metrics for this account
          const { data: postsWithMetrics } = await supabase
            .from('posts')
            .select(`
              id,
              post_format,
              published_at,
              post_metrics (likes, retweets, views, collected_at)
            `)
            // @ts-expect-error - Account type inference issue
            .eq('account_id', account.id)
            .eq('status', 'published')
            .not('published_at', 'is', null)
            .limit(100)

          if (!postsWithMetrics || postsWithMetrics.length === 0) {
            continue
          }

          // Analyze timing data
          const timingData: Record<string, number[]> = {
            morning: [],
            afternoon: [],
            evening: [],
          }

          const dayData: Record<string, number[]> = {}
          const formatData: Record<string, number[]> = {}

          for (const post of postsWithMetrics) {
            // @ts-expect-error - Post type inference issue
            const metrics = Array.isArray(post.post_metrics)
              // @ts-expect-error - Post type inference issue
              ? post.post_metrics[0]
              // @ts-expect-error - Post type inference issue
              : post.post_metrics

            // @ts-expect-error - Post type inference issue
            if (!metrics || !post.published_at) continue

            const engagement = (metrics as any).likes || 0
            // @ts-expect-error - Post type inference issue
            const publishedDate = new Date(post.published_at)
            const hour = publishedDate.getHours()
            const day = publishedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

            // Categorize by time of day
            if (hour >= 6 && hour < 12) {
              timingData.morning.push(engagement)
            } else if (hour >= 12 && hour < 18) {
              timingData.afternoon.push(engagement)
            } else {
              timingData.evening.push(engagement)
            }

            // Track by day of week
            if (!dayData[day]) dayData[day] = []
            dayData[day].push(engagement)

            // Track by format
            // @ts-expect-error - Post type inference issue
            if (post.post_format) {
              // @ts-expect-error - Post type inference issue
              if (!formatData[post.post_format]) formatData[post.post_format] = []
              // @ts-expect-error - Post type inference issue
              formatData[post.post_format].push(engagement)
            }
          }

          // Calculate best time of day
          const avgTiming = Object.entries(timingData).map(([time, engagements]) => ({
            time,
            avg: engagements.length > 0
              ? engagements.reduce((a, b) => a + b, 0) / engagements.length
              : 0,
            count: engagements.length,
          }))
          const bestTime = avgTiming.reduce((best, current) =>
            current.avg > best.avg ? current : best
          )

          // Calculate best day of week
          const avgDay = Object.entries(dayData).map(([day, engagements]) => ({
            day,
            avg: engagements.length > 0
              ? engagements.reduce((a, b) => a + b, 0) / engagements.length
              : 0,
            count: engagements.length,
          }))
          const bestDay = avgDay.length > 0
            ? avgDay.reduce((best, current) => (current.avg > best.avg ? current : best))
            : null

          // Calculate best format
          const avgFormat = Object.entries(formatData).map(([format, engagements]) => ({
            format,
            avg: engagements.length > 0
              ? engagements.reduce((a, b) => a + b, 0) / engagements.length
              : 0,
            count: engagements.length,
          }))
          const bestFormat = avgFormat.length > 0
            ? avgFormat.reduce((best, current) => (current.avg > best.avg ? current : best))
            : null

          // Calculate overall average engagement
          const allEngagements = Object.values(timingData).flat()
          const avgEngagement = allEngagements.length > 0
            ? allEngagements.reduce((a, b) => a + b, 0) / allEngagements.length
            : 0

          // Update or insert learning data
          const { error: learningError } = await supabase
            .from('learning_data')
            // @ts-expect-error - Supabase type inference issue with upsert
            .upsert({
              // @ts-expect-error - Account type inference issue
              user_id: account.user_id,
              // @ts-expect-error - Account type inference issue
              account_id: account.id,
              best_time_of_day: bestTime.count >= 3 ? bestTime.time : null,
              best_day_of_week: bestDay && bestDay.count >= 3 ? bestDay.day : null,
              best_format: bestFormat && bestFormat.count >= 3 ? bestFormat.format : null,
              avg_engagement: avgEngagement,
              sample_size: postsWithMetrics.length,
              last_updated: new Date().toISOString(),
            }, {
              onConflict: 'user_id,account_id'
            })

          if (learningError) {
            // @ts-expect-error - Account type inference issue
            errors.push(`Account ${account.id}: ${learningError.message}`)
            continue
          }

          // Log success
          // @ts-ignore - Supabase type inference issue
          await supabase.from('pipeline_logs').insert({
            // @ts-expect-error - Account type inference issue
            user_id: account.user_id,
            step: 'learning',
            status: 'success',
            message: 'Learning data updated',
            metadata: {
              // @ts-expect-error - Account type inference issue
              account_id: account.id,
              best_time: bestTime.time,
              best_day: bestDay?.day,
              best_format: bestFormat?.format,
              sample_size: postsWithMetrics.length,
            },
          })

          updated++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          // @ts-expect-error - Account type inference issue
          errors.push(`Account ${account.id}: ${errorMessage}`)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // @ts-expect-error - User type inference issue
      errors.push(`User ${user.id}: ${errorMessage}`)
    }
  }

  return { updated, errors }
}

