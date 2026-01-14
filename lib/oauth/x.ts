// X (Twitter) OAuth 2.0
// https://developer.twitter.com/en/docs/authentication/oauth-2-0

import crypto from 'crypto'

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  return { codeVerifier, codeChallenge }
}

export function getXOAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  // CRITICAL: Scopes MUST be space-separated, NOT comma-separated
  // X OAuth 2.0 requires EXACTLY this format
  const scope = 'tweet.write users.read offline.access'

  // Build parameters - URLSearchParams will properly encode spaces as %20
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`
  
  // DEBUG: Log the authorize URL to verify all parameters
  console.log('=== X OAuth 2.0 Authorize URL ===')
  console.log('Full URL:', authUrl)
  console.log('Parameters:')
  console.log('  - response_type:', params.get('response_type'))
  console.log('  - client_id:', clientId.substring(0, 10) + '...')
  console.log('  - redirect_uri:', redirectUri)
  console.log('  - scope:', params.get('scope'))
  console.log('  - state:', state.substring(0, 10) + '...')
  console.log('  - code_challenge:', codeChallenge.substring(0, 20) + '...')
  console.log('  - code_challenge_method:', params.get('code_challenge_method'))
  console.log('================================')

  return authUrl
}

export async function exchangeXCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  console.log('=== Token Exchange Request ===')
  console.log('Endpoint: https://api.twitter.com/2/oauth2/token')
  console.log('Grant type: authorization_code')
  console.log('Code:', code.substring(0, 20) + '...')
  console.log('Redirect URI:', redirectUri)
  console.log('Code verifier length:', codeVerifier.length)
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })

  console.log('Request body params:', Array.from(body.keys()).join(', '))

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: body.toString(),
  })

  console.log('Response status:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Token exchange failed!')
    console.error('Status:', response.status)
    console.error('Response:', errorText)
    
    let errorObj
    try {
      errorObj = JSON.parse(errorText)
    } catch {
      errorObj = { error: 'parse_error', error_description: errorText }
    }
    
    console.error('Error code:', errorObj.error)
    console.error('Error description:', errorObj.error_description)
    
    throw new Error(
      `Token exchange failed: ${errorObj.error} - ${errorObj.error_description || 'Unknown error'}`
    )
  }

  const tokenData = await response.json()
  console.log('✅ Token exchange successful!')
  console.log('Access token received:', tokenData.access_token ? 'Yes' : 'No')
  console.log('Refresh token received:', tokenData.refresh_token ? 'Yes' : 'No')
  console.log('Expires in:', tokenData.expires_in, 'seconds')
  console.log('==============================')
  
  return tokenData
}

export async function getXUserInfo(accessToken: string): Promise<{
  id: string
  username: string
  name: string
}> {
  const response = await fetch('https://api.twitter.com/2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  const data = await response.json()
  return data.data
}

export async function refreshXToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  return await response.json()
}

