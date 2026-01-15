// X (Twitter) OAuth 1.0a utilities
// Used for manual credential connection and request signing

import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

export interface XOAuth1Credentials {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

/**
 * Create OAuth 1.0a instance
 */
function createOAuthClient(apiKey: string, apiSecret: string): OAuth {
  return new OAuth({
    consumer: {
      key: apiKey,
      secret: apiSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64')
    },
  })
}

/**
 * Validate X OAuth 1.0a credentials by making a test API call
 * Returns user info if valid, throws error if invalid
 */
export async function validateXCredentials(
  credentials: XOAuth1Credentials
): Promise<{ id: string; username: string; name: string }> {
  const oauth = createOAuthClient(credentials.apiKey, credentials.apiSecret)
  
  const requestData = {
    url: 'https://api.twitter.com/2/users/me',
    method: 'GET',
  }
  
  const token = {
    key: credentials.accessToken,
    secret: credentials.accessTokenSecret,
  }
  
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token))
  
  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = 'Invalid X credentials'
    
    try {
      const errorData = JSON.parse(errorText)
      errorMsg = errorData.detail || errorData.error || errorMsg
    } catch {
      // Use default error message
    }
    
    throw new Error(errorMsg)
  }
  
  const data = await response.json()
  
  if (!data.data || !data.data.id || !data.data.username) {
    throw new Error('Invalid response from X API')
  }
  
  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name || data.data.username,
  }
}

/**
 * Post a tweet using OAuth 1.0a credentials
 */
export async function postTweetOAuth1(
  credentials: XOAuth1Credentials,
  text: string
): Promise<{ id: string }> {
  const oauth = createOAuthClient(credentials.apiKey, credentials.apiSecret)
  
  const requestData = {
    url: 'https://api.twitter.com/2/tweets',
    method: 'POST',
  }
  
  const token = {
    key: credentials.accessToken,
    secret: credentials.accessTokenSecret,
  }
  
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token))
  
  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = 'Failed to post tweet'
    
    try {
      const errorData = JSON.parse(errorText)
      errorMsg = errorData.detail || errorData.error || errorMsg
    } catch {
      // Use default error message
    }
    
    throw new Error(errorMsg)
  }
  
  const data = await response.json()
  
  if (!data.data || !data.data.id) {
    throw new Error('Invalid response from X API')
  }
  
  return {
    id: data.data.id,
  }
}


