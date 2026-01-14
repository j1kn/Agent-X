import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('ai_provider, topics, tone, posting_frequency')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ai_provider, ai_api_key, topics, tone, posting_frequency } = await request.json()

  const updateData: any = {}

  if (ai_provider) updateData.ai_provider = ai_provider
  if (ai_api_key) updateData.ai_api_key = ai_api_key
  if (topics) updateData.topics = topics
  if (tone) updateData.tone = tone
  if (posting_frequency) updateData.posting_frequency = posting_frequency

  const { error } = await supabase
    .from('user_profiles')
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

