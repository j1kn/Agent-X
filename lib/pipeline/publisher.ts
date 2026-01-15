import { createServiceClient } from '@/lib/supabase/server'
import { publishToTelegram } from '@/lib/platforms/telegram'
import { publishToX } from '@/lib/platforms/x'
import { publishToLinkedIn } from '@/lib/platforms/linkedin'
import { Platform } from '@/lib/types/platform'
import type { PublishArgs } from '@/lib/platforms/types'

// 🚨 RULE: All platform publishers MUST use PublishArgs object signature.
// Positional arguments are forbidden to prevent type drift.
// This ensures compile-time type safety and consistent interfaces across all platforms.

export async function publishScheduledPosts(): Promise<{
  published: number
  failed: number
  errors: string[]
}> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let published = 0
  let failed = 0

  // STEP 1: Query posts where status = 'scheduled' and scheduled_for <= NOW()
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      connected_accounts (
        platform,
        access_token,
        refresh_token,
        username,
        platform_user_id
      )
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())

  if (error) {
    errors.push(`Failed to query scheduled posts: ${error.message}`)
    return { published, failed, errors }
  }

  if (!posts || posts.length === 0) {
    return { published, failed, errors }
  }

  console.log(`[Publisher] Found ${posts.length} posts ready to publish`)

  // STEP 2: Process each post with row locking
  for (const post of posts) {
    try {
      // @ts-expect-error - Post type inference issue
      const postId = post.id
      // @ts-expect-error - Post type inference issue
      const userId = post.user_id
      // @ts-expect-error - Post type inference issue
      const content = post.content
      // @ts-expect-error - Post type inference issue
      const account = post.connected_accounts as any

      if (!account) {
        throw new Error('Connected account not found')
      }

      const platform = account.platform as Platform

      // STEP 2.1: Lock row by updating status to 'publishing' (prevents duplicate execution)
      const { error: lockError } = await supabase
        .from('posts')
        // @ts-expect-error - Supabase type inference issue
        .update({ status: 'publishing' })
        .eq('id', postId)
        .eq('status', 'scheduled') // Only update if still scheduled (atomic lock)

      if (lockError) {
        console.warn(`[Publisher] Failed to lock post ${postId}, skipping`)
        continue // Skip if another worker already claimed it
      }

      console.log(`[Publisher] Publishing post ${postId} to ${platform}`)

      // STEP 2.2: Route to platform-specific publisher using standardized PublishArgs
      let result

      // Build standardized arguments object
      const publishArgs: PublishArgs = {
        accessToken: account.access_token,
        platformUserId: account.platform_user_id || account.username, // Use org ID for LinkedIn, username for Telegram
        content,
        tokenExpiresAt: account.token_expires_at || null,
      }

      switch (platform) {
        case 'telegram':
          // For Telegram: platformUserId is the channel username
          result = await publishToTelegram({
            ...publishArgs,
            platformUserId: account.username, // Telegram uses username field
          })
          break

        case 'x':
          // For X: accessToken contains encrypted OAuth 1.0a credentials JSON
          result = await publishToX(publishArgs)
          break

        case 'linkedin':
          // For LinkedIn: platformUserId is the organization ID
          result = await publishToLinkedIn({
            ...publishArgs,
            platformUserId: account.platform_user_id, // LinkedIn uses platform_user_id
            tokenExpiresAt: account.token_expires_at || null,
          })
          break

        default:
          throw new Error(`Unsupported platform: ${platform}`)
      }

      // STEP 2.3: Handle success
      if (result.success && result.platformPostId) {
        // Update post status to 'published'
        await supabase
          .from('posts')
          // @ts-expect-error - Supabase type inference issue
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            platform_post_id: result.platformPostId,
          })
          .eq('id', postId)

        // Log success
        // @ts-ignore - Supabase type inference issue
        await supabase.from('pipeline_logs').insert({
          user_id: userId,
          step: 'publishing',
          status: 'success',
          message: `Post published to ${platform}`,
          metadata: { post_id: postId, platform_post_id: result.platformPostId, platform },
        })

        console.log(`[Publisher] ✅ Post ${postId} published to ${platform}`)
        published++
      } else {
        throw new Error(result.error || 'Unknown publishing error')
      }
    } catch (error) {
      // STEP 2.4: Handle failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // @ts-expect-error - Post type inference issue
      const postId = post.id
      // @ts-expect-error - Post type inference issue
      const userId = post.user_id
      // @ts-expect-error - Post type inference issue
      const account = post.connected_accounts as any
      const platform = account?.platform || 'unknown'

      // Update post status to 'failed'
      await supabase
        .from('posts')
        // @ts-expect-error - Supabase type inference issue
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)

      // Log error
      // @ts-ignore - Supabase type inference issue
      await supabase.from('pipeline_logs').insert({
        user_id: userId,
        step: 'publishing',
        status: 'error',
        message: `Failed to publish post: ${errorMessage}`,
        metadata: { post_id: postId, error: errorMessage, platform },
      })

      console.error(`[Publisher] ❌ Post ${postId} failed: ${errorMessage}`)
      errors.push(`Post ${postId}: ${errorMessage}`)
      failed++
    }
  }

  console.log(`[Publisher] Completed: ${published} published, ${failed} failed`)
  return { published, failed, errors }
}

