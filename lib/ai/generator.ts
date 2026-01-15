import { generateWithAnthropic } from './providers/anthropic'
import { createClient } from '@/lib/supabase/server'

export interface GenerateOptions {
  topic: string
  tone: string
  recentPosts?: string[]
  format?: string
}

/**
 * Generate content using built-in Claude API key from env vars
 * Server-side only - never exposes API key to client
 */
export async function generateContent(
  userId: string,
  options: GenerateOptions
): Promise<{ content: string; prompt: string; model: string }> {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai/generator.ts:15',message:'generateContent ENTRY',data:{userId,topic:options.topic,hasClaudeKey:!!process.env.CLAUDE_API_KEY,keyLength:process.env.CLAUDE_API_KEY?.length||0,vercelEnv:process.env.VERCEL_ENV,nodeEnv:process.env.NODE_ENV,allEnvKeys:Object.keys(process.env).filter(k=>k.includes('CLAUDE')||k.includes('VERCEL')||k.includes('NODE'))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,E'})}).catch(()=>{});
  // #endregion
  
  // Read Claude API key from env (server-side only)
  const claudeApiKey = process.env.CLAUDE_API_KEY

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai/generator.ts:20',message:'After reading CLAUDE_API_KEY',data:{hasKey:!!claudeApiKey,keyLength:claudeApiKey?.length||0,keyPrefix:claudeApiKey?.substring(0,10)||'NONE'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion

  if (!claudeApiKey) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai/generator.ts:23',message:'THROWING ERROR - claudeApiKey is falsy',data:{claudeApiKey:String(claudeApiKey),typeOf:typeof claudeApiKey},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C,E'})}).catch(()=>{});
    // #endregion
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

  // Always use Claude (built-in provider)
  const model = 'claude-3-5-sonnet-20241022'
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

  return {
    content: content.trim(),
    prompt,
    model,
  }
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

