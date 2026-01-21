import { generateWithAnthropic } from './providers/anthropic'
import { createClient } from '@/lib/supabase/server'

export interface GenerateOptions {
  topic: string
  tone: string
  recentPosts?: string[]
  format?: string
  generateImagePrompt?: boolean
}

export interface GenerateResult {
  content: string
  prompt: string
  model: string
  imagePrompt?: string
}

/**
 * Generate content using built-in Claude API key from env vars
 * Server-side only - never exposes API key to client
 *
 * Can also generate detailed image prompts for Stability AI
 */
export async function generateContent(
  userId: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  // Read Claude API key from env (server-side only)
  const claudeApiKey = process.env.CLAUDE_API_KEY

  if (!claudeApiKey) {
    throw new Error('CLAUDE_API_KEY not configured in environment variables')
  }

  const supabase = await createClient()

  // Fetch user's training instructions only (no AI keys from user)
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('training_instructions')
    .eq('id', userId)
    .single()

  const profile = profileData as { training_instructions?: string | null } | null
  const trainingInstructions = profile?.training_instructions || undefined

  // Build prompt with training instructions
  const prompt = buildPrompt(options, trainingInstructions || undefined)

  // Always use Claude (built-in provider) - Claude Sonnet 4.5
  const model = 'claude-sonnet-4-5'
  let content: string

  try {
    content = await generateWithAnthropic(claudeApiKey, prompt, model)
  } catch (error) {
    console.error('[AI Generator] Claude API error:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Generated content is empty')
  }

  // Log AI usage for tracking (per-user)
  try {
    await supabase
      .from('pipeline_logs')
      // @ts-expect-error - Supabase insert type inference issue
      .insert({
        user_id: userId,
        step: 'generation',
        status: 'success',
        message: 'AI content generated using Claude',
        metadata: {
          model,
          provider: 'anthropic',
          prompt_length: prompt.length,
          content_length: content.trim().length,
          timestamp: new Date().toISOString(),
        },
      })
  } catch (logError) {
    // Don't fail generation if logging fails
    console.error('[AI Generator] Failed to log usage:', logError)
  }

  const result: GenerateResult = {
    content: content.trim(),
    prompt,
    model,
  }

  // Generate image prompt if requested
  if (options.generateImagePrompt) {
    try {
      console.log('[AI Generator] Generating image prompt with Claude...')
      const imagePrompt = await generateImagePromptWithClaude(claudeApiKey, content.trim())
      result.imagePrompt = imagePrompt
      console.log('[AI Generator] ✓ Image prompt created:', imagePrompt.substring(0, 100) + '...')
    } catch (error) {
      console.error('[AI Generator] Failed to generate image prompt:', error)
      // Don't fail the whole generation if image prompt fails
    }
  }

  return result
}

/**
 * Generate a detailed image prompt using Claude
 * This prompt will be used by Stability AI to generate the actual image
 */
async function generateImagePromptWithClaude(
  apiKey: string,
  postContent: string
): Promise<string> {
  const prompt = `You are an expert at creating image generation prompts for AI image generators like Stability AI.

Based on this social media post:
"${postContent}"

Create a detailed, vivid image generation prompt that will produce a professional, eye-catching image perfect for social media.

Requirements:
- Describe the main subject clearly and specifically
- Include visual style (e.g., "modern digital art", "photorealistic", "minimalist illustration", "vibrant 3D render")
- Specify colors, mood, and atmosphere
- Mention composition and framing
- Make it suitable for 1024x1024 square format
- Keep it under 150 words
- Focus on visual elements, not text or words in the image

Return ONLY the image generation prompt, nothing else. No explanations, no meta-commentary.`

  const imagePrompt = await generateWithAnthropic(apiKey, prompt, 'claude-sonnet-4-5')
  
  if (!imagePrompt || imagePrompt.trim().length < 10) {
    throw new Error('Generated image prompt is too short or empty')
  }
  
  return imagePrompt.trim()
}

function buildPrompt(options: GenerateOptions, trainingInstructions?: string): string {
  const { topic, tone, recentPosts, format } = options

  let prompt = ''

  // Inject training instructions at the top if available (Agent X constitution)
  if (trainingInstructions && trainingInstructions.trim()) {
    prompt += `AGENT X CONSTITUTION (follow these guidelines):\n${trainingInstructions}\n\n`
    prompt += '---\n\n'
  }

  prompt += `Generate a social media post about "${topic}" with a ${tone} tone.`

  if (format) {
    prompt += ` Use a ${format} format.`
  }

  if (recentPosts && recentPosts.length > 0) {
    prompt += `\n\nRecent posts (avoid repetition):\n${recentPosts.join('\n')}`
  }

  prompt += '\n\nGenerate only the post content, no explanations or meta-commentary. Keep it concise and engaging (under 280 characters for X/Twitter compatibility).'

  return prompt
}

