import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Define types for query results
type UserProfile = {
  topics: string[] | null
}

type ConnectedAccount = {
  id: string
}

type ScheduleConfig = {
  days_of_week: string[] | null
  times: string[] | null
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { autopilot_enabled } = await request.json()

  // If enabling, validate requirements first
  if (autopilot_enabled) {
    // Check AI is configured (via env var)
    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json({ 
        error: 'AI not configured. Contact administrator.',
        missingRequirements: true
      }, { status: 400 })
    }

    // Check user has topics configured
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('topics')
      .eq('id', user.id)
      .single()

    const profile = profileData as UserProfile | null

    if (!profile?.topics || profile.topics.length === 0) {
      return NextResponse.json({ 
        error: 'No topics configured. Go to Settings to add topics.',
        missingRequirements: true
      }, { status: 400 })
    }

    // Check connected accounts
    const { data: accountsData } = await supabase
      .from('connected_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const accounts = accountsData as ConnectedAccount[] | null

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ 
        error: 'No social accounts connected. Go to Accounts to connect.',
        missingRequirements: true
      }, { status: 400 })
    }

    // Check schedule
    const { data: scheduleData } = await supabase
      .from('schedule_config')
      .select('days_of_week, times')
      .eq('user_id', user.id)
      .single()

    const schedule = scheduleData as ScheduleConfig | null

    if (!schedule || !schedule.days_of_week?.length || !schedule.times?.length) {
      return NextResponse.json({ 
        error: 'No schedule configured. Go to Schedule to set posting times.',
        missingRequirements: true
      }, { status: 400 })
    }
  }

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
