import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getXOAuthUrl, generatePKCE } from '@/lib/oauth/x'
import { verifyBotToken, getChatInfo, checkBotIsAdmin } from '@/lib/oauth/telegram'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

// GET handler for X OAuth (direct browser navigation with HTTP 302 redirect)
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const platform = requestUrl.searchParams.get('platform')

  // Only handle X OAuth via GET (direct navigation)
  if (platform !== 'x') {
    return NextResponse.json({ error: 'Use POST for other platforms' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`)
  }

  console.log('=== Initiating X OAuth 2.0 Flow (GET) ===')
  
  const clientId = process.env.X_CLIENT_ID!
  const clientSecret = process.env.X_CLIENT_SECRET!
  
  if (!clientId || !clientSecret) {
    console.error('X OAuth credentials missing!')
    return NextResponse.redirect(`${requestUrl.origin}/accounts?error=oauth_not_configured`)
  }

  // Build redirect URI - MUST match exactly what's in X Developer Portal
  const origin = requestUrl.origin
  const redirectUri = `${origin}/api/accounts/callback/x`
  
  console.log('Redirect URI:', redirectUri)
  console.log('⚠️  VERIFY: This MUST match exactly in X Developer Portal → App Settings → Callback URLs')

  // Generate PKCE challenge
  const { codeVerifier, codeChallenge } = generatePKCE()
  
  console.log('PKCE Generated:')
  console.log('  - code_verifier length:', codeVerifier.length)
  console.log('  - code_challenge length:', codeChallenge.length)

  // Generate unique state for this OAuth request
  const crypto = require('crypto')
  const state = crypto.randomBytes(32).toString('base64url')
  
  console.log('State generated:', state.substring(0, 10) + '...')

  // Store code_verifier securely server-side
  const { error: storageError } = await supabase
    .from('oauth_pkce_storage')
    // @ts-expect-error - Supabase type inference issue
    .insert({
      state,
      code_verifier: codeVerifier,
      user_id: user.id,
    })

  if (storageError) {
    console.error('❌ Failed to store PKCE code:', storageError)
    return NextResponse.redirect(`${origin}/accounts?error=oauth_init_failed`)
  }
  
  console.log('✅ PKCE code stored successfully')

  // Build OAuth URL with PKCE challenge
  const authUrl = getXOAuthUrl(clientId, redirectUri, state, codeChallenge)
  
  console.log('🚀 Returning HTTP 302 redirect to X OAuth')
  console.log('===================================')

  // CRITICAL: Return HTTP 302 redirect (not JSON)
  return NextResponse.redirect(authUrl)
}

// POST handler for Telegram (requires bot token in body)
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { platform, botToken, channelUsername } = await request.json()

  if (!platform || !['telegram'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform or use GET for X' }, { status: 400 })
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

