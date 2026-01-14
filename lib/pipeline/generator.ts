import { generateContent } from '@/lib/ai/generator'
import { createClient } from '@/lib/supabase/server'
import { validatePostContent } from '@/lib/utils/validation'
import type { PlanningResult } from './planner'

export interface GenerationResult {
  postId: string
  content: string
}

export async function generatePost(
  userId: string,
  plan: PlanningResult
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

  // 2. Get recent posts for context
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('content')
    .eq('user_id', userId)
    .eq('platform', plan.platform)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentContent = recentPosts?.map((p: { content: string }) => p.content) || []

  // 3. Generate content using AI
  const { content, prompt, model } = await generateContent(userId, {
    topic: plan.topic,
    tone,
    recentPosts: recentContent,
    format: plan.format,
  })

  // 4. Validate content
  const validation = validatePostContent(content, plan.platform)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // 5. Store post in database (draft status)
  const { data: post, error } = await supabase
    .from('posts')
    // @ts-expect-error - Supabase type inference issue
    .insert({
      user_id: userId,
      account_id: plan.accountId,
      status: 'draft',
      content,
      platform: plan.platform,
      generation_prompt: prompt,
      generation_model: model,
      generation_metadata: {},
      post_format: plan.format,
    })
    .select()
    .single()

  if (error || !post) {
    throw new Error('Failed to create post')
  }

  return {
    // @ts-expect-error - Post type inference issue
    postId: post.id,
    // @ts-expect-error - Post type inference issue
    content: post.content,
  }
}

