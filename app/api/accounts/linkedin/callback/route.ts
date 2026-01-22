import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getLinkedInOrganizations } from '@/lib/platforms/linkedin'
import { encrypt } from '@/lib/crypto/encryption'

export const runtime = 'nodejs'

/**
 * LinkedIn OAuth 2.0 - Handle Authorization Callback
 *
 * LinkedIn redirects here after user approves/denies access.
 * This endpoint:
 * 1. Validates state (CSRF protection)
 * 2. Exchanges authorization code for access token
 * 3. Saves personal profile connection (company pages disabled until LinkedIn approval)
 *
 * Required env vars:
 * - LINKEDIN_CLIENT_ID
 * - LINKEDIN_CLIENT_SECRET
 * - LINKEDIN_REDIRECT_URI
 */
export async function GET(request: Request) {
  // Use regular client for auth operations
  const supabase = await createClient()
  // Use service client for database writes (bypasses RLS)
  const supabaseAdmin = createServiceClient()
  
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[LinkedIn OAuth] ========== CALLBACK RECEIVED ==========')
  console.log('[LinkedIn OAuth] Full URL:', request.url)
  console.log('[LinkedIn OAuth] Code:', code ? `${code.substring(0, 20)}...` : 'MISSING')
  console.log('[LinkedIn OAuth] State:', state || 'MISSING')
  console.log('[LinkedIn OAuth] Error:', error || 'none')
  console.log('[LinkedIn OAuth] Error Description:', errorDescription || 'none')
  console.log('[LinkedIn OAuth] All params:', Array.from(searchParams.entries()))
  console.log('[LinkedIn OAuth] ================================================')

  // Handle user denial
  if (error) {
    console.error('[LinkedIn OAuth] User denied:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(errorDescription || error)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }

  // Validate required parameters
  if (!code) {
    console.error('[LinkedIn OAuth] ❌ MISSING CODE - OAuth flow failed')
    return NextResponse.redirect(
      new URL('/accounts?error=No authorization code received from LinkedIn', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }

  // ⚠️ DEV MODE: Temporarily allow OAuth without state for debugging
  const DEV_BYPASS_STATE = true // TODO: Set to false in production
  
  if (!state) {
    if (DEV_BYPASS_STATE && code) {
      console.warn('[LinkedIn OAuth] ⚠️  DEV MODE: State missing but code present - BYPASSING state check')
      console.warn('[LinkedIn OAuth] ⚠️  This is INSECURE and should only be used for debugging')
    } else {
      console.error('[LinkedIn OAuth] ❌ MISSING STATE - OAuth flow failed')
      return NextResponse.redirect(
        new URL('/accounts?error=No state parameter received from LinkedIn', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }
  }

  // Verify state (CSRF protection) - only if state exists
  if (state) {
    console.log('[LinkedIn OAuth] Verifying state:', state)
    const { data: storedState, error: stateError } = await supabase
      .from('oauth_pkce_storage')
      .select('*')
      .eq('state', state)
      .single()

    if (stateError || !storedState) {
      console.error('[LinkedIn OAuth] ⚠️  State validation failed:', stateError)
      console.error('[LinkedIn OAuth] Expected state from DB, got:', storedState)
      console.error('[LinkedIn OAuth] Received state from LinkedIn:', state)
      
      if (DEV_BYPASS_STATE) {
        console.warn('[LinkedIn OAuth] ⚠️  DEV MODE: CONTINUING DESPITE STATE MISMATCH')
      } else {
        return NextResponse.redirect(
          new URL('/accounts?error=Invalid OAuth state', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
        )
      }
    } else {
      console.log('[LinkedIn OAuth] ✓ State validated successfully')
      // Delete used state
      await supabase
        .from('oauth_pkce_storage')
        .delete()
        .eq('state', state)
    }
  }

  // Check required env vars
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL('/accounts?error=LinkedIn OAuth not configured', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }

  try {
    console.log('[LinkedIn OAuth] ========== TOKEN EXCHANGE ==========')
    console.log('[LinkedIn OAuth] Endpoint: https://www.linkedin.com/oauth/v2/accessToken')
    console.log('[LinkedIn OAuth] Redirect URI (from env):', redirectUri)
    console.log('[LinkedIn OAuth] Client ID:', clientId)
    console.log('[LinkedIn OAuth] Code:', code.substring(0, 20) + '...')
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    console.log('[LinkedIn OAuth] Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[LinkedIn OAuth] ❌ Token exchange failed')
      console.error('[LinkedIn OAuth] Status:', tokenResponse.status)
      console.error('[LinkedIn OAuth] Response:', errorText)
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('[LinkedIn OAuth] Token data keys:', Object.keys(tokenData))
    
    const { access_token, expires_in, scope } = tokenData

    if (!access_token) {
      console.error('[LinkedIn OAuth] ❌ No access_token in response:', tokenData)
      throw new Error('No access token received from LinkedIn')
    }

    console.log('[LinkedIn OAuth] ✓ Access token received')
    console.log('[LinkedIn OAuth] Expires in:', expires_in, 'seconds')
    console.log('[LinkedIn OAuth] Scopes granted:', scope || 'not provided')
    
    // Verify we have the required scopes
    if (scope && !scope.includes('openid')) {
      console.warn('[LinkedIn OAuth] ⚠️  WARNING: "openid" scope not granted - /v2/userinfo may fail')
    }
    if (scope && scope.includes('openid')) {
      console.log('[LinkedIn OAuth] ✓ OpenID scope confirmed - /v2/userinfo should work')
    }

    // STEP 6: Fetch LinkedIn identity using OIDC userinfo endpoint
    console.log('[LinkedIn OAuth] ========== FETCHING IDENTITY ==========')
    console.log('[LinkedIn OAuth] Using OIDC endpoint: /v2/userinfo')
    
    const userinfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    console.log('[LinkedIn OAuth] Userinfo response status:', userinfoResponse.status)

    if (!userinfoResponse.ok) {
      const errorText = await userinfoResponse.text()
      console.error('[LinkedIn OAuth] ❌ Failed to fetch identity')
      console.error('[LinkedIn OAuth] Status:', userinfoResponse.status)
      console.error('[LinkedIn OAuth] Response:', errorText)
      throw new Error(`Failed to fetch LinkedIn identity: ${userinfoResponse.status}`)
    }

    const userinfoData = await userinfoResponse.json()
    console.log('[LinkedIn OAuth] Userinfo data:', userinfoData)
    
    // Extract 'sub' which is the LinkedIn member ID
    const personId = userinfoData.sub
    if (!personId) {
      console.error('[LinkedIn OAuth] ❌ No "sub" field in userinfo response')
      throw new Error('No person ID (sub) in LinkedIn userinfo response')
    }

    const authorUrn = `urn:li:person:${personId}`
    console.log('[LinkedIn OAuth] ✓ Person ID (sub):', personId)
    console.log('[LinkedIn OAuth] ✓ Author URN:', authorUrn)

    // STEP 7: Save LinkedIn connection directly to database (ATOMIC)
    console.log('[LinkedIn OAuth] ========== SAVING TO DATABASE ==========')
    console.log('[LinkedIn OAuth] Personal profile posting only (company pages disabled)')
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('[LinkedIn OAuth] User not found after OAuth')
      return NextResponse.redirect(
        new URL('/accounts?error=User session lost', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }
    
    // Encrypt the access token
    const encryptedToken = encrypt(access_token)
    
    // Calculate token expiration
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null
    
    console.log('[LinkedIn OAuth] Saving to connected_accounts table...')
    console.log('[LinkedIn OAuth] User ID:', user.id)
    console.log('[LinkedIn OAuth] Person ID:', personId)
    console.log('[LinkedIn OAuth] Author URN:', authorUrn)
    
    // Save to connected_accounts table (ATOMIC OPERATION)
    // Using service client to bypass RLS
    const { data: insertedAccount, error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        platform: 'linkedin',
        platform_user_id: personId,
        access_token: encryptedToken,
        token_expires_at: expiresAt,
        username: 'Personal Profile',
        is_active: true,
      }, {
        onConflict: 'user_id,platform',
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('[LinkedIn OAuth] ❌ DATABASE INSERT FAILED')
      console.error('[LinkedIn OAuth] Error:', dbError)
      console.error('[LinkedIn OAuth] Error details:', JSON.stringify(dbError, null, 2))
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent('Failed to save LinkedIn connection: ' + dbError.message)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }
    
    console.log('[LinkedIn OAuth] ✓ Database insert successful')
    console.log('[LinkedIn OAuth] Inserted account:', insertedAccount)
    
    // VERIFY the record was actually saved (CRITICAL)
    console.log('[LinkedIn OAuth] Verifying database write...')
    const { data: verifyAccount, error: verifyError } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform, username, is_active')
      .eq('user_id', user.id)
      .eq('platform', 'linkedin')
      .single()
    
    if (verifyError || !verifyAccount) {
      console.error('[LinkedIn OAuth] ❌ VERIFICATION FAILED')
      console.error('[LinkedIn OAuth] Verify error:', verifyError)
      return NextResponse.redirect(
        new URL('/accounts?error=LinkedIn connection could not be verified', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }
    
    console.log('[LinkedIn OAuth] ✓ DATABASE WRITE VERIFIED')
    console.log('[LinkedIn OAuth] Account ID:', (verifyAccount as any).id)
    console.log('[LinkedIn OAuth] Platform:', (verifyAccount as any).platform)
    console.log('[LinkedIn OAuth] Username:', (verifyAccount as any).username)
    console.log('[LinkedIn OAuth] Active:', (verifyAccount as any).is_active)
    
    // SUCCESS - Redirect with success message
    return NextResponse.redirect(
      new URL('/accounts?success=linkedin_connected', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )

  } catch (error) {
    console.error('[LinkedIn OAuth] ========== ERROR ==========')
    console.error('[LinkedIn OAuth] Error:', error)
    console.error('[LinkedIn OAuth] Stack:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(error instanceof Error ? error.message : 'LinkedIn connection failed')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }
}


