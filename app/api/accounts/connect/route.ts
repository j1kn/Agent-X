import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getXOAuthUrl } from '@/lib/oauth/x'
import { getTelegramOAuthUrl } from '@/lib/oauth/telegram'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { platform } = await request.json()

  if (!platform || !['telegram', 'x'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/accounts/callback/${platform}`

  let authUrl: string

  if (platform === 'x') {
    const clientId = process.env.X_CLIENT_ID!
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')
    authUrl = getXOAuthUrl(clientId, redirectUri, state)
  } else if (platform === 'telegram') {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME!
    authUrl = getTelegramOAuthUrl(botUsername, redirectUri)
  } else {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  }

  return NextResponse.json({ authUrl })
}

