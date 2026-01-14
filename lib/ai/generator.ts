import { generateWithGemini } from './providers/gemini'
import { generateWithOpenAI } from './providers/openai'
import { generateWithAnthropic } from './providers/anthropic'
import { createClient } from '@/lib/supabase/server'

export type AIProvider = 'gemini' | 'openai' | 'anthropic'

export interface GenerateOptions {
  topic: string
  tone: string
  recentPosts?: string[]
  format?: string
}

export async function generateContent(
  userId: string,
  options: GenerateOptions
): Promise<{ content: string; prompt: string; model: string }> {
  const supabase = await createClient()

  // Fetch user's AI provider and API key (server-only)
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('ai_provider, ai_api_key')
    .eq('id', userId)
    .single()

  // @ts-expect-error - Profile type inference issue
  if (error || !profile?.ai_provider || !profile?.ai_api_key) {
    throw new Error('AI provider not configured')
  }

  const { ai_provider, ai_api_key } = profile

  // Build prompt
  const prompt = buildPrompt(options)

  // Generate content based on provider
  let content: string
  let model: string

  try {
    switch (ai_provider) {
      case 'gemini':
        model = 'gemini-1.5-flash'
        content = await generateWithGemini(ai_api_key, prompt, model)
        break
      case 'openai':
        content = await generateWithOpenAI(ai_api_key, prompt)
        model = 'gpt-4'
        break
      case 'anthropic':
        content = await generateWithAnthropic(ai_api_key, prompt)
        model = 'claude-3-5-sonnet'
        break
      default:
        throw new Error(`Unsupported AI provider: ${ai_provider}`)
    }
  } catch (error) {
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Generated content is empty')
  }

  return {
    content: content.trim(),
    prompt,
    model,
  }
}

function buildPrompt(options: GenerateOptions): string {
  const { topic, tone, recentPosts, format } = options

  let prompt = `Generate a social media post about "${topic}" with a ${tone} tone.`

  if (format) {
    prompt += ` Use a ${format} format.`
  }

  if (recentPosts && recentPosts.length > 0) {
    prompt += `\n\nRecent posts (avoid repetition):\n${recentPosts.join('\n')}`
  }

  prompt += '\n\nGenerate only the post content, no explanations or meta-commentary. Keep it concise and engaging (under 280 characters for X/Twitter compatibility).'

  return prompt
}

