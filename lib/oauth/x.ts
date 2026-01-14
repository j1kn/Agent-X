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
  // Required scopes for posting and reading user info
  const scope = 'tweet.write users.read offline.access'

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`
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
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to exchange code for token')
  }

  return await response.json()
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

