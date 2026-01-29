import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('training_instructions, training_profile_v2')
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

  const body = await request.json()
  const { training_instructions, training_profile_v2 } = body

  // Build update object - only include fields that are provided
  const updateData: Record<string, unknown> = {
    id: user.id,
  }

  // Always allow updating training_instructions (existing field)
  if (training_instructions !== undefined) {
    updateData.training_instructions = training_instructions
  }

  // Only include training_profile_v2 if explicitly provided
  if (training_profile_v2 !== undefined) {
    // Validate structure if provided (basic type checking)
    if (training_profile_v2 !== null && typeof training_profile_v2 !== 'object') {
      return NextResponse.json(
        { error: 'training_profile_v2 must be an object or null' },
        { status: 400 }
      )
    }
    updateData.training_profile_v2 = training_profile_v2
  }

  const { error } = await supabase
    .from('user_profiles')
    // @ts-expect-error - Supabase upsert type inference issue
    .upsert(updateData, {
      onConflict: 'id'
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

