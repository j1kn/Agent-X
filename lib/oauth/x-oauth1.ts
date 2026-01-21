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
 * Upload media to X (Twitter) and get media_id
 */
async function uploadMediaToX(
  credentials: XOAuth1Credentials,
  imageUrl: string
): Promise<string> {
  const oauth = createOAuthClient(credentials.apiKey, credentials.apiSecret)
  
  // Download image from URL
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error('Failed to download image')
  }
  
  const imageBuffer = await imageResponse.arrayBuffer()
  const imageBase64 = Buffer.from(imageBuffer).toString('base64')
  
  // Upload media using v1.1 API (media upload endpoint)
  const uploadRequestData = {
    url: 'https://upload.twitter.com/1.1/media/upload.json',
    method: 'POST',
  }
  
  const token = {
    key: credentials.accessToken,
    secret: credentials.accessTokenSecret,
  }
  
  const authHeader = oauth.toHeader(oauth.authorize(uploadRequestData, token))
  
  const formData = new FormData()
  formData.append('media_data', imageBase64)
  
  const uploadResponse = await fetch(uploadRequestData.url, {
    method: uploadRequestData.method,
    headers: {
      ...authHeader,
    },
    body: formData,
  })
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`Failed to upload media: ${errorText}`)
  }
  
  const uploadData = await uploadResponse.json()
  
  if (!uploadData.media_id_string) {
    throw new Error('No media_id returned from upload')
  }
  
  return uploadData.media_id_string
}

/**
 * Post a tweet using OAuth 1.0a credentials
 */
export async function postTweetOAuth1(
  credentials: XOAuth1Credentials,
  text: string,
  mediaUrls?: string[]
): Promise<{ id: string }> {
  const oauth = createOAuthClient(credentials.apiKey, credentials.apiSecret)
  
  // Upload media if provided
  let mediaIds: string[] = []
  if (mediaUrls && mediaUrls.length > 0) {
    console.log('[X] Uploading media...')
    for (const mediaUrl of mediaUrls) {
      try {
        const mediaId = await uploadMediaToX(credentials, mediaUrl)
        mediaIds.push(mediaId)
        console.log('[X] Media uploaded:', mediaId)
      } catch (error) {
        console.error('[X] Failed to upload media:', error)
        // Continue without media if upload fails
      }
    }
  }
  
  const requestData = {
    url: 'https://api.twitter.com/2/tweets',
    method: 'POST',
  }
  
  const token = {
    key: credentials.accessToken,
    secret: credentials.accessTokenSecret,
  }
  
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token))
  
  // Build tweet payload
  const tweetPayload: any = { text }
  if (mediaIds.length > 0) {
    tweetPayload.media = {
      media_ids: mediaIds
    }
  }
  
  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetPayload),
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


