import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Define types for query results
type UserProfile = {
  tone: string | null
  posting_frequency: string | null
  gemini_api_key: string | null
  stability_api_key: string | null
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileData, error } = await supabase
    .from('user_profiles')
    .select('tone, posting_frequency, gemini_api_key, stability_api_key')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profile = profileData as UserProfile | null

  // AI is always connected via built-in Claude key
  const isAiConnected = !!process.env.CLAUDE_API_KEY
  const isGeminiConnected = !!(profile?.gemini_api_key)
  const isStabilityConnected = !!(profile?.stability_api_key)

  return NextResponse.json({
    profile: profile ? {
      tone: profile.tone,
      posting_frequency: profile.posting_frequency,
      gemini_api_key: profile.gemini_api_key ? '••••••••' : null, // Mask the key
      stability_api_key: profile.stability_api_key ? '••••••••' : null, // Mask the key
    } : null,
    isAiConnected,
    isGeminiConnected,
    isStabilityConnected,
    aiProvider: 'Claude (Built-in)' // Show users we're using Claude
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Accept tone, posting_frequency, gemini_api_key, and stability_api_key
  const { tone, posting_frequency, gemini_api_key, stability_api_key } = await request.json()

  const updateData: Record<string, unknown> = {}

  if (tone) updateData.tone = tone
  if (posting_frequency) updateData.posting_frequency = posting_frequency
  if (gemini_api_key !== undefined) updateData.gemini_api_key = gemini_api_key
  if (stability_api_key !== undefined) updateData.stability_api_key = stability_api_key

  const { error } = await supabase
    .from('user_profiles')
    // @ts-expect-error - Supabase upsert type inference issue
    .upsert({
      id: user.id,
      ...updateData,
    }, {
      onConflict: 'id'
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
