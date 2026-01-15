import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Define types for query results
type UserProfile = {
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
    .select('topics, tone, posting_frequency')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profile = profileData as UserProfile | null

  // AI is always connected via built-in Claude key
  const isAiConnected = !!process.env.CLAUDE_API_KEY
  
  // Debug logging (remove after confirming it works)
  console.log('[Settings API] CLAUDE_API_KEY present:', !!process.env.CLAUDE_API_KEY)
  console.log('[Settings API] CLAUDE_API_KEY length:', process.env.CLAUDE_API_KEY?.length || 0)

  return NextResponse.json({ 
    profile: profile ? {
      topics: profile.topics,
      tone: profile.tone,
      posting_frequency: profile.posting_frequency,
    } : null,
    isAiConnected,
    aiProvider: 'Claude (Built-in)' // Show users we're using Claude
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only accept topics, tone, posting_frequency (no AI keys)
  const { topics, tone, posting_frequency } = await request.json()

  const updateData: Record<string, unknown> = {}

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
