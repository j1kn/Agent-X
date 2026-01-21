import type { PublishArgs, PublishResult } from '@/lib/pipeline/types'
import type { EngagementMetrics } from './types'
import { decrypt } from '@/lib/crypto/encryption'
import { postTweetOAuth1, type XOAuth1Credentials } from '@/lib/oauth/x-oauth1'

// 🚨 RULE: Never mutate destructured args or function inputs.
// Always derive new variables (finalContent, finalText, etc).

/**
 * Parse and decrypt X OAuth 1.0a credentials from stored JSON
 */
function decryptXCredentials(encryptedJson: string): XOAuth1Credentials {
  const parsed = JSON.parse(encryptedJson)
  
  return {
    apiKey: decrypt(parsed.apiKey),
    apiSecret: decrypt(parsed.apiSecret),
    accessToken: decrypt(parsed.accessToken),
    accessTokenSecret: decrypt(parsed.accessTokenSecret),
  }
}

export async function publishToX(
  args: PublishArgs
): Promise<PublishResult> {
  const { accessToken, content, mediaUrls } = args
  
  try {
    // Decrypt OAuth 1.0a credentials at runtime
    // accessToken contains the encrypted JSON credentials for X
    const credentials = decryptXCredentials(accessToken)
    
    // Log if media is being included
    if (mediaUrls && mediaUrls.length > 0) {
      console.log(`[X Publisher] Publishing tweet with ${mediaUrls.length} media attachment(s)`)
    }
    
    // Post tweet using OAuth 1.0a signing (with optional media)
    const result = await postTweetOAuth1(credentials, content, mediaUrls)

    return {
      success: true,
      postId: result.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getXMetrics(
  encryptedCredentials: string,
  tweetId: string
): Promise<EngagementMetrics> {
  try {
    // Decrypt OAuth 1.0a credentials at runtime
    const credentials = decryptXCredentials(encryptedCredentials)
    
    // Create OAuth client for request signing
    const OAuth = require('oauth-1.0a')
    const crypto = require('crypto')
    
    const oauth = new OAuth({
      consumer: {
        key: credentials.apiKey,
        secret: credentials.apiSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64')
      },
    })
    
    const requestData = {
      url: `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
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
      },
    })

    const data = await response.json()

    if (!response.ok || !data.data) {
      return {
        likes: 0,
        retweets: 0,
        views: 0,
      }
    }

    const metrics = data.data.public_metrics || {}

    return {
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      views: metrics.impression_count || 0,
    }
  } catch (error) {
    return {
      likes: 0,
      retweets: 0,
      views: 0,
    }
  }
}

