import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { autopilot_enabled } = await request.json()

  const { error } = await supabase
    .from('user_profiles')
    // @ts-expect-error - Supabase upsert type inference issue
    .upsert({
      id: user.id,
      autopilot_enabled,
    }, {
      onConflict: 'id'
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, autopilot_enabled })
}

