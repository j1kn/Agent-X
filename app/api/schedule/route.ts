import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: schedule, error } = await supabase
    .from('schedule_config')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ schedule })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    days_of_week,
    times,
    frequency,
    timezone,
    image_generation_enabled,
    image_times,
    platform_preferences
  } = await request.json()

  // Validate platform_preferences if provided
  if (platform_preferences) {
    if (typeof platform_preferences !== 'object' || Array.isArray(platform_preferences)) {
      return NextResponse.json(
        { error: 'platform_preferences must be an object' },
        { status: 400 }
      )
    }
    
    // Validate each time slot has valid platforms
    const validPlatforms = ['linkedin', 'x', 'telegram']
    for (const [time, platforms] of Object.entries(platform_preferences)) {
      if (!Array.isArray(platforms)) {
        return NextResponse.json(
          { error: `platform_preferences['${time}'] must be an array` },
          { status: 400 }
        )
      }
      
      for (const platform of platforms as string[]) {
        if (!validPlatforms.includes(platform)) {
          return NextResponse.json(
            { error: `Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}` },
            { status: 400 }
          )
        }
      }
    }
  }

  const { error } = await supabase
    .from('schedule_config')
    // @ts-expect-error - Supabase upsert type inference issue
    .upsert({
      user_id: user.id,
      days_of_week,
      times,
      frequency,
      timezone: timezone || 'UTC',
      image_generation_enabled: image_generation_enabled || false,
      image_times: image_times || [],
      platform_preferences: platform_preferences || {},
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

