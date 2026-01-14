import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Define types for query results
type UserProfile = {
  autopilot_enabled: boolean | null
  ai_provider: string | null
  ai_api_key: string | null
  topics: string[] | null
}

type ConnectedAccount = {
  id: string
}

type ScheduleConfig = {
  days_of_week: string[] | null
  times: string[] | null
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch profile with required fields
  const { data: profileData, error } = await supabase
    .from('user_profiles')
    .select('autopilot_enabled, ai_provider, ai_api_key, topics')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profile = profileData as UserProfile | null

  // Check connected accounts
  const { data: accountsData } = await supabase
    .from('connected_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const accounts = accountsData as ConnectedAccount[] | null

  // Check schedule config
  const { data: scheduleData } = await supabase
    .from('schedule_config')
    .select('days_of_week, times')
    .eq('user_id', user.id)
    .single()

  const schedule = scheduleData as ScheduleConfig | null

  // Calculate requirements
  const requirements = {
    aiConnected: !!(profile?.ai_provider && profile?.ai_api_key),
    hasTopics: !!(profile?.topics && profile.topics.length > 0),
    hasAccounts: !!(accounts && accounts.length > 0),
    hasSchedule: !!(schedule?.days_of_week && schedule.days_of_week.length > 0 && schedule?.times && schedule.times.length > 0),
  }

  return NextResponse.json({ 
    profile: profile ? { autopilot_enabled: profile.autopilot_enabled } : null,
    requirements 
  })
}
