export interface PublishResult {
  success: boolean
  platformPostId?: string
  error?: string
}

export interface EngagementMetrics {
  likes: number
  retweets: number
  views: number
}

export type Platform = 'telegram' | 'x' | 'linkedin'

