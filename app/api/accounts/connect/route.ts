import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getXOAuthUrl, generatePKCE } from '@/lib/oauth/x'
import { verifyBotToken, getChatInfo, checkBotIsAdmin } from '@/lib/oauth/telegram'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { platform, botToken, channelUsername } = await request.json()

  if (!platform || !['telegram', 'x'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  // X OAuth Flow
  if (platform === 'x') {
    const clientId = process.env.X_CLIENT_ID!
    if (!clientId) {
      return NextResponse.json({ error: 'X OAuth not configured' }, { status: 500 })
    }

    const origin = new URL(request.url).origin
    const redirectUri = `${origin}/api/accounts/callback/x`

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = generatePKCE()

    // Store code verifier in session (you could also use a temp DB table)
    // For now, we'll pass it in state (not ideal for production, but works for demo)
    const state = Buffer.from(
      JSON.stringify({ 
        userId: user.id, 
        codeVerifier 
      })
    ).toString('base64')

    const authUrl = getXOAuthUrl(clientId, redirectUri, state, codeChallenge)

    return NextResponse.json({ authUrl })
  }

  // Telegram Bot Token Flow
  if (platform === 'telegram') {
    if (!botToken || !channelUsername) {
      return NextResponse.json({ 
        error: 'Bot token and channel username required' 
      }, { status: 400 })
    }

    try {
      // 1. Verify bot token is valid
      const botInfo = await verifyBotToken(botToken)

      // 2. Get channel info
      const chatInfo = await getChatInfo(botToken, channelUsername)

      // 3. Check if bot is admin
      const isAdmin = await checkBotIsAdmin(
        botToken,
        chatInfo.result.id,
        botInfo.result.id
      )

      if (!isAdmin) {
        return NextResponse.json({ 
          error: 'Bot must be added as administrator to the channel' 
        }, { status: 400 })
      }

      // 4. Save to database
      const { error } = await supabase
        .from('connected_accounts')
        // @ts-expect-error - Supabase type inference issue with upsert
        .upsert({
          user_id: user.id,
          platform: 'telegram',
          platform_user_id: chatInfo.result.id.toString(),
          access_token: botToken,
          username: chatInfo.result.username || chatInfo.result.title,
          is_active: true,
        }, {
          onConflict: 'user_id,platform'
        })

      if (error) {
        return NextResponse.json({ 
          error: 'Failed to save connection' 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        username: chatInfo.result.username || chatInfo.result.title
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
}

