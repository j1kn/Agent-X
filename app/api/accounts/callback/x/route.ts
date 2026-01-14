import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { exchangeXCodeForToken, getXUserInfo } from '@/lib/oauth/x'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const origin = requestUrl.origin

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/accounts?error=missing_params`)
  }

  try {
    // Decode state to get user ID
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString())

    // Exchange code for token
    const tokenData = await exchangeXCodeForToken(
      code,
      process.env.X_CLIENT_ID!,
      process.env.X_CLIENT_SECRET!,
      `${origin}/api/accounts/callback/x`
    )

    // Get user info
    const userInfo = await getXUserInfo(tokenData.access_token)

    // Save to database
    const supabase = await createClient()

    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    const { error } = await supabase
      .from('connected_accounts')
      // @ts-expect-error - Supabase type inference issue with upsert
      .upsert({
        user_id: userId,
        platform: 'x',
        platform_user_id: userInfo.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        username: userInfo.username,
        is_active: true,
      }, {
        onConflict: 'user_id,platform'
      })

    if (error) {
      return NextResponse.redirect(`${origin}/accounts?error=db_error`)
    }

    return NextResponse.redirect(`${origin}/accounts?success=x_connected`)
  } catch (error) {
    console.error('X OAuth error:', error)
    return NextResponse.redirect(`${origin}/accounts?error=oauth_failed`)
  }
}

