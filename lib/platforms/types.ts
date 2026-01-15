import { Platform } from '@/lib/types/platform'

// Re-export PublishArgs and PublishResult from single source of truth
// These types are defined in lib/pipeline/types.ts
export type { PublishArgs, PublishResult } from '@/lib/pipeline/types'

export interface EngagementMetrics {
  likes: number
  retweets: number
  views: number
}

// Re-export Platform for convenience
export type { Platform }

