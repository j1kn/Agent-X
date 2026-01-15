// 🚨 SINGLE SOURCE OF TRUTH
// All platform publishers MUST import PublishArgs and PublishResult from this file.
// Defining these types anywhere else is forbidden.

/**
 * Standardized arguments for all platform publishers
 * Object-based signature prevents type drift and argument count mismatches
 */
export type PublishArgs = {
  accessToken: string
  platformUserId?: string
  content: string
  mediaUrls?: string[]
  tokenExpiresAt?: string | null
}

/**
 * Standardized result from all platform publishers
 */
export type PublishResult = {
  success: boolean
  postId?: string
  error?: string
}

