import type { PublishResult, EngagementMetrics } from './types'

export async function publishToX(
  accessToken: string,
  content: string
): Promise<PublishResult> {
  try {
    // X (Twitter) API v2 - Create tweet
    const url = 'https://api.twitter.com/2/tweets'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || data.title || 'Failed to publish to X',
      }
    }

    return {
      success: true,
      platformPostId: data.data.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getXMetrics(
  accessToken: string,
  tweetId: string
): Promise<EngagementMetrics> {
  try {
    // X API v2 - Get tweet metrics
    const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

