import { createServiceClient } from '@/lib/supabase/server'
import { publishToTelegram } from '@/lib/platforms/telegram'
import { publishToX } from '@/lib/platforms/x'

export async function publishScheduledPosts(): Promise<{
  published: number
  failed: number
  errors: string[]
}> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let published = 0
  let failed = 0

  // Query posts where status = 'scheduled' and scheduled_for <= NOW()
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      connected_accounts (
        platform,
        access_token,
        refresh_token,
        username
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

  // Process each post
  for (const post of posts) {
    try {
      const account = post.connected_accounts as any

      if (!account) {
        throw new Error('Connected account not found')
      }

      let result

      // Publish to platform
      if (account.platform === 'telegram') {
        result = await publishToTelegram(
          account.access_token,
          account.username,
          post.content
        )
      } else if (account.platform === 'x') {
        result = await publishToX(account.access_token, post.content)
      } else {
        throw new Error(`Unsupported platform: ${account.platform}`)
      }

      if (result.success && result.platformPostId) {
        // Update post status to 'published'
        await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            platform_post_id: result.platformPostId,
          })
          .eq('id', post.id)

        // Log success
        await supabase.from('pipeline_logs').insert({
          user_id: post.user_id,
          step: 'publishing',
          status: 'success',
          message: `Post published to ${account.platform}`,
          metadata: { post_id: post.id, platform_post_id: result.platformPostId },
        })

        published++
      } else {
        throw new Error(result.error || 'Unknown publishing error')
      }
    } catch (error) {
      // Update post status to 'failed'
      await supabase
        .from('posts')
        .update({
          status: 'failed',
        })
        .eq('id', post.id)

      // Log error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await supabase.from('pipeline_logs').insert({
        user_id: post.user_id,
        step: 'publishing',
        status: 'error',
        message: `Failed to publish post: ${errorMessage}`,
        metadata: { post_id: post.id, error: errorMessage },
      })

      errors.push(`Post ${post.id}: ${errorMessage}`)
      failed++
    }
  }

  return { published, failed, errors }
}

