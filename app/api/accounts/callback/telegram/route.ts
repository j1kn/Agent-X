import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { verifyTelegramAuth, type TelegramAuthData } from '@/lib/oauth/telegram'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const origin = new URL(request.url).origin

  try {
    const authData: TelegramAuthData = await request.json()

    // Verify Telegram auth
    const isValid = verifyTelegramAuth(authData, process.env.TELEGRAM_BOT_TOKEN!)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Save to database
    const { error } = await supabase
      .from('connected_accounts')
      // @ts-expect-error - Supabase type inference issue with upsert
      .upsert({
        user_id: user.id,
        platform: 'telegram',
        platform_user_id: authData.id.toString(),
        access_token: process.env.TELEGRAM_BOT_TOKEN!, // Bot token for posting
        username: authData.username || `user_${authData.id}`,
        is_active: true,
      }, {
        onConflict: 'user_id,platform'
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to save account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Telegram OAuth error:', error)
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 })
  }
}

