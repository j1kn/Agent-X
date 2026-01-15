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

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  }

  // Check required env vars
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'LinkedIn OAuth not configured. Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI.' },
      { status: 500 }
    )
  }

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')

  // Store state in oauth_pkce_storage table (reusing existing table)
  await supabase
    .from('oauth_pkce_storage')
    // @ts-expect-error - Supabase insert type inference issue
    .insert({
      state,
      code_verifier: '', // Not used for LinkedIn (OAuth 2.0 without PKCE), but column is required
      user_id: user.id,
    })

  // Build LinkedIn OAuth authorization URL
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', 'r_liteprofile r_organization_social w_organization_social')

  console.log('[LinkedIn OAuth] Redirecting to:', authUrl.toString())

  // Redirect to LinkedIn authorization page
  return NextResponse.redirect(authUrl.toString())
}


