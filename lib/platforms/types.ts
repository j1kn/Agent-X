import { Platform } from '@/lib/types/platform'

/**
 * 🚨 STANDARD PUBLISHER INTERFACE - ALL PLATFORMS MUST USE THIS
 * 
 * This interface ensures type safety and prevents signature drift.
 * Positional arguments are FORBIDDEN - use object-based arguments only.
 */
export interface PublishArgs {
  /** Encrypted or raw access token (platform-specific) */
  accessToken: string
  /** Platform-specific user/organization ID (e.g., LinkedIn org ID, Telegram channel username) */
  platformUserId?: string
  /** Post content to publish */
  content: string
  /** Optional media URLs for future media support */
  mediaUrls?: string[]
  /** Optional token expiration (for platforms that need it) */
  tokenExpiresAt?: string | null
}

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

