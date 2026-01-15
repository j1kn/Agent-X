import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getLinkedInOrganizations } from '@/lib/platforms/linkedin'

export const runtime = 'nodejs'

/**
 * LinkedIn OAuth 2.0 - Handle Authorization Callback
 * 
 * LinkedIn redirects here after user approves/denies access.
 * This endpoint:
 * 1. Validates state (CSRF protection)
 * 2. Exchanges authorization code for access token
 * 3. Fetches organizations user can post to
 * 4. Redirects to accounts page with organization list
 * 
 * Required env vars:
 * - LINKEDIN_CLIENT_ID
 * - LINKEDIN_CLIENT_SECRET
 * - LINKEDIN_REDIRECT_URI
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle user denial
  if (error) {
    console.error('[LinkedIn OAuth] User denied:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(errorDescription || error)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/accounts?error=Invalid OAuth callback parameters', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }

  // Verify state (CSRF protection)
  const { data: storedState, error: stateError } = await supabase
    .from('oauth_pkce_storage')
    .select('*')
    .eq('state', state)
    .single()

  if (stateError || !storedState) {
    console.error('[LinkedIn OAuth] Invalid state:', stateError)
    return NextResponse.redirect(
      new URL('/accounts?error=Invalid OAuth state', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }

  // Delete used state
  await supabase
    .from('oauth_pkce_storage')
    .delete()
    .eq('state', state)

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

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[LinkedIn OAuth] Token exchange failed:', errorData)
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, expires_in } = tokenData

    if (!access_token) {
      throw new Error('No access token received from LinkedIn')
    }

    console.log('[LinkedIn OAuth] Token received, fetching organizations...')

    // Fetch organizations user can manage
    const organizations = await getLinkedInOrganizations(access_token)

    if (organizations.length === 0) {
      return NextResponse.redirect(
        new URL('/accounts?error=No LinkedIn Company Pages found. You must be an admin of at least one Company Page.', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    console.log(`[LinkedIn OAuth] Found ${organizations.length} organization(s)`)

    // Store token and organization data in session/cookie for the save step
    // (In production, you might want to use encrypted session storage)
    // For now, we'll pass it via URL parameters (less secure but simpler for this implementation)
    
    // Encode organization data as JSON
    const orgData = Buffer.from(JSON.stringify({
      access_token,
      expires_in,
      organizations,
    })).toString('base64')

    // Redirect to accounts page with organization selection modal
    return NextResponse.redirect(
      new URL(`/accounts?linkedin_auth=success&data=${encodeURIComponent(orgData)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )

  } catch (error) {
    console.error('[LinkedIn OAuth] Callback error:', error)
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(error instanceof Error ? error.message : 'LinkedIn connection failed')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }
}

