import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * LinkedIn OAuth 2.0 - Initiate Authorization Flow
 * 
 * This endpoint redirects the user to LinkedIn's authorization page.
 * After user approves, LinkedIn redirects back to /api/accounts/linkedin/callback
 * 
 * Required env vars:
 * - LINKEDIN_CLIENT_ID
 * - LINKEDIN_REDIRECT_URI
 */
export async function GET() {
  const supabase = await createClient()

  console.log('[LinkedIn OAuth DEBUG] Starting OAuth flow')
  console.log('[LinkedIn OAuth DEBUG] All env vars:', {
    hasClientId: !!process.env.LINKEDIN_CLIENT_ID,
    hasClientSecret: !!process.env.LINKEDIN_CLIENT_SECRET,
    hasRedirectUri: !!process.env.LINKEDIN_REDIRECT_URI,
    redirectUriValue: process.env.LINKEDIN_REDIRECT_URI,
    redirectUriLength: process.env.LINKEDIN_REDIRECT_URI?.length,
  })

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[LinkedIn OAuth DEBUG] User not authenticated, redirecting to login')
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  }

  console.log('[LinkedIn OAuth DEBUG] User authenticated:', user.id)

  // Check required env vars
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.error('[LinkedIn OAuth DEBUG] Missing env vars:', { clientId: !!clientId, redirectUri: !!redirectUri })
    return NextResponse.json(
      { error: 'LinkedIn OAuth not configured. Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI.' },
      { status: 500 }
    )
  }

  // Validate redirect URI format
  if (!redirectUri.startsWith('https://')) {
    console.error('[LinkedIn OAuth DEBUG] Redirect URI missing https://', redirectUri)
    return NextResponse.json(
      { error: `Invalid LINKEDIN_REDIRECT_URI: Must start with https:// but got: ${redirectUri}` },
      { status: 500 }
    )
  }

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')

  console.log('[LinkedIn OAuth DEBUG] Generated state:', state)

  // Store state in oauth_pkce_storage table (reusing existing table)
  const { error: insertError } = await supabase
    .from('oauth_pkce_storage')
    // @ts-expect-error - Supabase insert type inference issue
    .insert({
      state,
      code_verifier: '', // Not used for LinkedIn (OAuth 2.0 without PKCE), but column is required
      user_id: user.id,
    })

  if (insertError) {
    console.error('[LinkedIn OAuth DEBUG] Failed to store state:', insertError)
  }

  // Build LinkedIn OAuth authorization URL
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  // Updated to use modern LinkedIn API v2 scopes
  authUrl.searchParams.set('scope', 'openid profile email w_member_social r_organization_admin w_organization_social')

  const finalUrl = authUrl.toString()
  
  console.log('[LinkedIn OAuth DEBUG] Final authorization URL:', finalUrl)
  console.log('[LinkedIn OAuth DEBUG] Redirect URI in URL:', authUrl.searchParams.get('redirect_uri'))
  console.log('[LinkedIn OAuth DEBUG] Client ID:', clientId)
  console.log('[LinkedIn OAuth DEBUG] Scopes:', authUrl.searchParams.get('scope'))

  // Redirect to LinkedIn authorization page
  return NextResponse.redirect(finalUrl)
}


