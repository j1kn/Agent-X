import { Platform } from '@/lib/types/platform'

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

// Re-export Platform for convenience
export type { Platform }

