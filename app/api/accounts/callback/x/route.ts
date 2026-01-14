import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { exchangeXCodeForToken, getXUserInfo } from '@/lib/oauth/x'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  console.log('=== X OAuth 2.0 Callback ===')
  console.log('URL:', requestUrl.toString())
  
  // Check if X returned an error
  if (error) {
    console.error('❌ X OAuth Error:', error)
    console.error('Description:', errorDescription)
    return NextResponse.redirect(
      `${origin}/accounts?error=${encodeURIComponent(error + ': ' + (errorDescription || 'Unknown'))}`
    )
  }

  if (!code || !state) {
    console.error('❌ Missing code or state parameter')
    console.log('Code present:', !!code)
    console.log('State present:', !!state)
    return NextResponse.redirect(`${origin}/accounts?error=missing_params`)
  }

  console.log('✅ Code received:', code.substring(0, 20) + '...')
  console.log('✅ State received:', state.substring(0, 10) + '...')

  // Use service client for PKCE lookup (bypasses RLS)
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = createServiceClient()

  try {
    // Retrieve code_verifier from secure storage using state
    console.log('📥 Looking up PKCE code_verifier from database...')
    const { data: pkceData, error: pkceError } = await supabase
      .from('oauth_pkce_storage')
      .select('code_verifier, user_id')
      .eq('state', state)
      .single()

    if (pkceError || !pkceData) {
      console.error('❌ PKCE lookup failed:', pkceError)
      console.error('This usually means:')
      console.error('  1. State parameter was tampered with')
      console.error('  2. PKCE code expired (>10 min)')
      console.error('  3. PKCE code was already used')
      return NextResponse.redirect(`${origin}/accounts?error=invalid_state`)
    }

    const { code_verifier: codeVerifier, user_id: userId } = pkceData
    console.log('✅ PKCE code_verifier retrieved')
    console.log('User ID:', userId)

    // Delete the PKCE code immediately after retrieval (one-time use)
    await supabase
      .from('oauth_pkce_storage')
      .delete()
      .eq('state', state)
    console.log('✅ PKCE code deleted (one-time use enforced)')

    // Exchange code for token with PKCE code verifier
    console.log('🔄 Exchanging authorization code for access token...')
    const redirectUri = `${origin}/api/accounts/callback/x`
    console.log('Redirect URI (must match):', redirectUri)
    
    const tokenData = await exchangeXCodeForToken(
      code,
      process.env.X_CLIENT_ID!,
      process.env.X_CLIENT_SECRET!,
      redirectUri,
      codeVerifier
    )
    
    console.log('✅ Access token received')
    console.log('Token expires in:', tokenData.expires_in, 'seconds')

    // Get user info
    console.log('👤 Fetching user info...')
    const userInfo = await getXUserInfo(tokenData.access_token)
    console.log('✅ User info received:', userInfo.username)

    // Save to database
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    console.log('💾 Saving to database...')
    const { error: dbError } = await supabase
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

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.redirect(`${origin}/accounts?error=db_error`)
    }

    console.log('✅ Account connected successfully!')
    console.log('===========================')
    return NextResponse.redirect(`${origin}/accounts?success=x_connected`)
    
  } catch (error) {
    console.error('❌ X OAuth error:', error)
    
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(`${origin}/accounts?error=${encodeURIComponent(message)}`)
  }
}

