import { generateContent } from '@/lib/ai/generator'
import { createClient } from '@/lib/supabase/server'
import { validatePostContent } from '@/lib/utils/validation'
import { createPlatformVariants } from '@/lib/platforms/transformers'
import { getNextScheduledAt, type ScheduleConfig } from '@/lib/scheduling/smart-scheduler'

export interface MultiPlatformPost {
  postId: string
  platform: 'x' | 'telegram' | 'linkedin'
  content: string
  scheduledFor: Date
}

export interface GenerationResult {
  masterContent: string
  posts: MultiPlatformPost[]
}

/**
 * Generate ONE master post with Claude, then create platform variants
 * and schedule them for all connected accounts
 */
export async function generatePost(
  userId: string,
  topic: string
): Promise<GenerationResult> {
  const supabase = await createClient()

  // 1. Get user profile for tone
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tone')
    .eq('id', userId)
    .single()

  // @ts-expect-error - Profile type inference issue
  const tone = profile?.tone || 'professional'

  // 2. Get recent posts for context (any platform)
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentContent = recentPosts?.map((p: { content: string }) => p.content) || []

  // 3. Generate MASTER content using Claude (ONE call)
  const { content: masterContent, prompt, model } = await generateContent(userId, {
    topic,
    tone,
    recentPosts: recentContent,
  })

  // 4. Create platform-specific variants (deterministic, no AI calls)
  const variants = createPlatformVariants(masterContent)

  // 5. Get user's schedule configuration
  const { data: scheduleData } = await supabase
    .from('schedule_config')
    .select('*')
    .eq('user_id', userId)
    .single()

  const scheduleConfig: ScheduleConfig = scheduleData as ScheduleConfig || {}

  // 6. Calculate next scheduled time (smart scheduling)
  const scheduledTime = getNextScheduledAt(scheduleConfig)

  // 7. Get connected accounts for X and Telegram
  const { data: accounts } = await supabase
    .from('connected_accounts')
    .select('id, platform')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('platform', ['x', 'telegram'])

  if (!accounts || accounts.length === 0) {
    throw new Error('No active X or Telegram accounts connected')
  }

  // 8. Create posts for each connected account
  const posts: MultiPlatformPost[] = []
  
  for (const account of accounts) {
    const platform = account.platform as 'x' | 'telegram'
    const content = platform === 'x' ? variants.x : variants.telegram

    // Validate content for platform
    const validation = validatePostContent(content, platform)
    if (!validation.valid) {
      console.warn(`Skipping ${platform} post: ${validation.error}`)
      continue
    }

    // Store post in database (scheduled status)
    const { data: post, error } = await supabase
      .from('posts')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        user_id: userId,
        account_id: account.id,
        status: 'scheduled',
        content,
        platform,
        scheduled_for: scheduledTime.toISOString(),
        generation_prompt: prompt,
        generation_model: model,
        generation_metadata: { master_content: masterContent },
        post_format: 'social',
      })
      .select()
      .single()

    if (error || !post) {
      console.error(`Failed to create ${platform} post:`, error)
      continue
    }

    posts.push({
      // @ts-expect-error - Post type inference issue
      postId: post.id,
      platform,
      // @ts-expect-error - Post type inference issue
      content: post.content,
      scheduledFor: scheduledTime,
    })
  }

  if (posts.length === 0) {
    throw new Error('Failed to create any posts')
  }

  return {
    masterContent,
    posts,
  }
}

