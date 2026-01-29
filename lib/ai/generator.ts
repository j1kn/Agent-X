import { generateWithAnthropic } from './providers/anthropic'
import { createClient } from '@/lib/supabase/server'
import { TrainingProfileV2, getSafeTrainingProfile } from '@/lib/types/training'

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

  // Fetch user's training instructions AND training_profile_v2 (both optional)
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('training_instructions, training_profile_v2')
    .eq('id', userId)
    .single()

  const profile = profileData as {
    training_instructions?: string | null
    training_profile_v2?: unknown
  } | null
  
  const trainingInstructions = profile?.training_instructions || undefined
  const trainingProfileV2 = getSafeTrainingProfile(profile?.training_profile_v2)

  // Build prompt with training instructions and optional v2 profile
  const prompt = buildPrompt(options, trainingInstructions || undefined, trainingProfileV2 || undefined)

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
      const imagePrompt = await generateImagePromptWithClaude(
        claudeApiKey,
        content.trim(),
        trainingProfileV2?.image_rules
      )
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
 * Optionally uses image_rules from training_profile_v2 if available
 */
async function generateImagePromptWithClaude(
  apiKey: string,
  postContent: string,
  imageRules?: TrainingProfileV2['image_rules']
): Promise<string> {
  let prompt = `You are an expert at creating image generation prompts for AI image generators like Stability AI.

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
- Focus on visual elements, not text or words in the image`

  // Add image rules if available from training_profile_v2
  if (imageRules?.style_profile) {
    const sp = imageRules.style_profile
    prompt += '\n\nADDITIONAL STYLE REQUIREMENTS (from brand guidelines):'
    
    if (sp.style) {
      prompt += `\n- Visual Style: ${sp.style}`
    }
    if (sp.colour_palette && sp.colour_palette.length > 0) {
      prompt += `\n- Color Palette: ${sp.colour_palette.join(', ')}`
    }
    if (sp.mood) {
      prompt += `\n- Mood: ${sp.mood}`
    }
    if (sp.lighting) {
      prompt += `\n- Lighting: ${sp.lighting}`
    }
  }

  if (imageRules?.prompt_skeleton) {
    prompt += `\n\nTemplate to follow: ${imageRules.prompt_skeleton}`
  }

  prompt += '\n\nReturn ONLY the image generation prompt, nothing else. No explanations, no meta-commentary.'

  const imagePrompt = await generateWithAnthropic(apiKey, prompt, 'claude-sonnet-4-5')
  
  if (!imagePrompt || imagePrompt.trim().length < 10) {
    throw new Error('Generated image prompt is too short or empty')
  }
  
  return imagePrompt.trim()
}

function buildPrompt(
  options: GenerateOptions,
  trainingInstructions?: string,
  trainingProfileV2?: TrainingProfileV2
): string {
  const { topic, tone, recentPosts, format } = options

  let prompt = ''

  // Inject training instructions at the top if available (Agent X constitution)
  if (trainingInstructions && trainingInstructions.trim()) {
    prompt += `AGENT X CONSTITUTION (follow these guidelines):\n${trainingInstructions}\n\n`
    prompt += '---\n\n'
  }

  // Inject training_profile_v2 if available (additional structured context)
  if (trainingProfileV2 && Object.keys(trainingProfileV2).length > 0) {
    prompt += `ADDITIONAL STRUCTURED TRAINING CONTEXT (optional - use if relevant):\n`
    prompt += formatTrainingProfileV2(trainingProfileV2)
    prompt += '\n---\n\n'
  }

  prompt += `Generate a social media post about "${topic}" with a ${tone} tone.`

  if (format) {
    prompt += ` Use a ${format} format.`
  }

  if (recentPosts && recentPosts.length > 0) {
    prompt += `\n\nRecent posts (avoid repetition):\n${recentPosts.join('\n')}`
  }

  prompt += '\n\nGenerate only the post content, no explanations or meta-commentary. Keep it concise and engaging.'
  prompt += '\n\nIMPORTANT: This content will be adapted for multiple platforms:'
  prompt += '\n- X/Twitter (280 character limit)'
  prompt += '\n- Telegram (4096 character limit)'
  prompt += '\n- LinkedIn (3000 character limit, professional tone)'
  prompt += '\n\nCreate content that works well when shortened for X but can also be expanded for LinkedIn. Aim for 200-500 characters as a good middle ground.'

  return prompt
}

/**
 * Format training_profile_v2 into a readable prompt section
 * Only includes sections that have actual data
 */
function formatTrainingProfileV2(profile: TrainingProfileV2): string {
  let formatted = ''

  // Brand Identity
  if (profile.brand_identity) {
    const bi = profile.brand_identity
    if (bi.company_name || bi.industry || bi.target_audience) {
      formatted += '\nBrand Identity:\n'
      if (bi.company_name) formatted += `- Company: ${bi.company_name}\n`
      if (bi.industry) formatted += `- Industry: ${bi.industry}\n`
      if (bi.target_audience) formatted += `- Target Audience: ${bi.target_audience}\n`
      if (bi.short_description) formatted += `- Description: ${bi.short_description}\n`
    }
  }

  // Voice Rules
  if (profile.voice_rules) {
    const vr = profile.voice_rules
    if (vr.writing_style || vr.sentence_length || vr.preferred_phrases || vr.forbidden_phrases) {
      formatted += '\nVoice & Tone:\n'
      if (vr.writing_style) formatted += `- Style: ${vr.writing_style}\n`
      if (vr.sentence_length) formatted += `- Sentence Length: ${vr.sentence_length}\n`
      if (vr.preferred_phrases && vr.preferred_phrases.length > 0) {
        formatted += `- Preferred Phrases: ${vr.preferred_phrases.join(', ')}\n`
      }
      if (vr.forbidden_phrases && vr.forbidden_phrases.length > 0) {
        formatted += `- Forbidden Phrases: ${vr.forbidden_phrases.join(', ')}\n`
      }
    }
  }

  // Topics
  if (profile.topics) {
    const t = profile.topics
    if (t.primary || t.secondary || t.forbidden) {
      formatted += '\nTopics:\n'
      if (t.primary && t.primary.length > 0) {
        formatted += `- Primary: ${t.primary.join(', ')}\n`
      }
      if (t.secondary && t.secondary.length > 0) {
        formatted += `- Secondary: ${t.secondary.join(', ')}\n`
      }
      if (t.forbidden && t.forbidden.length > 0) {
        formatted += `- Forbidden: ${t.forbidden.join(', ')}\n`
      }
    }
  }

  // CTA Rules
  if (profile.cta_rules) {
    const cta = profile.cta_rules
    if (cta.placement || cta.reusable_ctas) {
      formatted += '\nCall-to-Action:\n'
      if (cta.placement) formatted += `- Placement: ${cta.placement}\n`
      if (cta.reusable_ctas && cta.reusable_ctas.length > 0) {
        formatted += `- Suggested CTAs: ${cta.reusable_ctas.join(' | ')}\n`
      }
    }
  }

  // Compliance
  if (profile.compliance) {
    const c = profile.compliance
    if (c.restricted_claims || c.forbidden_keywords || c.mandatory_disclaimers) {
      formatted += '\nCompliance:\n'
      if (c.restricted_claims && c.restricted_claims.length > 0) {
        formatted += `- Restricted Claims: ${c.restricted_claims.join(', ')}\n`
      }
      if (c.forbidden_keywords && c.forbidden_keywords.length > 0) {
        formatted += `- Forbidden Keywords: ${c.forbidden_keywords.join(', ')}\n`
      }
      if (c.mandatory_disclaimers && c.mandatory_disclaimers.length > 0) {
        formatted += `- Required Disclaimers: ${c.mandatory_disclaimers.join(' | ')}\n`
      }
    }
  }

  return formatted
}

