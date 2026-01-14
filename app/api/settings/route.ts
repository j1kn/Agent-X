import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Define types for query results
type UserProfile = {
  ai_provider: string | null
  ai_api_key: string | null
  default_model: string | null
  topics: string[] | null
  tone: string | null
  posting_frequency: string | null
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileData, error } = await supabase
    .from('user_profiles')
    .select('ai_provider, ai_api_key, default_model, topics, tone, posting_frequency')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profile = profileData as UserProfile | null

  // Return connection status (but never expose the actual API key)
  const isAiConnected = !!(profile?.ai_provider && profile?.ai_api_key)

  return NextResponse.json({ 
    profile: profile ? {
      ai_provider: profile.ai_provider,
      default_model: profile.default_model,
      topics: profile.topics,
      tone: profile.tone,
      posting_frequency: profile.posting_frequency,
    } : null,
    isAiConnected
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ai_provider, ai_api_key, default_model, topics, tone, posting_frequency } = await request.json()

  const updateData: Record<string, unknown> = {}

  if (ai_provider) updateData.ai_provider = ai_provider
  if (ai_api_key) updateData.ai_api_key = ai_api_key
  if (default_model !== undefined) updateData.default_model = default_model
  if (topics) updateData.topics = topics
  if (tone) updateData.tone = tone
  if (posting_frequency) updateData.posting_frequency = posting_frequency

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
