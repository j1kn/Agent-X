import { decrypt } from '@/lib/crypto/encryption'
import type { PublishArgs, PublishResult } from '@/lib/pipeline/types'
import type { EngagementMetrics } from './types'

// 🚨 RULE: Never mutate destructured args or function inputs.
// Always derive new variables (finalContent, finalText, etc).

/**
 * LinkedIn Personal Profile Posting
 * Uses OAuth 2.0 and UGC (User Generated Content) Posts API
 *
 * Requirements:
 * - OAuth scopes: openid, profile, email, w_member_social
 * - Posts to personal profiles only (company pages disabled until LinkedIn approval)
 * - Character limit: 3000 characters
 */

interface LinkedInUGCPost {
  author: string
  lifecycleState: 'PUBLISHED'
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string
      }
      shareMediaCategory: 'NONE'
    }
  }
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
  }
}

/**
 * Check if LinkedIn token has expired
 */
function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) <= new Date()
}

/**
 * Publish a text post to LinkedIn Personal Profile
 *
 * @param args - PublishArgs object with accessToken, platformUserId (person ID), content, tokenExpiresAt
 * @returns PublishResult with success status and post ID
 */
export async function publishToLinkedIn(
  args: PublishArgs
): Promise<PublishResult> {
  // Extract inputs (IMMUTABLE - never reassign)
  const { accessToken: encryptedToken, platformUserId: personId, content: rawContent, tokenExpiresAt } = args
  
  if (!personId) {
    return {
      success: false,
      error: 'LinkedIn person ID (platformUserId) is required',
    }
  }
  try {
    // Check token expiration before attempting to post
    if (isTokenExpired(tokenExpiresAt)) {
      return {
        success: false,
        error: 'LinkedIn token has expired. Please reconnect your account.',
      }
    }

    // Decrypt the access token
    const accessToken = decrypt(encryptedToken)

    // Derive final content (never mutate rawContent)
    let finalContent = rawContent
    if (rawContent.length > 3000) {
      console.warn('[LinkedIn] Content exceeds 3000 chars, truncating')
      finalContent = rawContent.substring(0, 2997) + '...'
    }

    // Build UGC post payload for personal profile
    const postPayload: LinkedInUGCPost = {
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: finalContent,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    // POST to LinkedIn UGC Posts API with modern headers
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postPayload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[LinkedIn] API error:', response.status, errorData)
      
      // Handle specific LinkedIn errors
      if (response.status === 401) {
        return {
          success: false,
          error: 'LinkedIn authentication failed. Token may be expired or invalid.',
        }
      }
      
      if (response.status === 403) {
        return {
          success: false,
          error: 'LinkedIn permission denied. Check OAuth scopes (w_member_social required).',
        }
      }
      
      return {
        success: false,
        error: `LinkedIn API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()
    
    // Extract post ID from response (format: urn:li:share:1234567890)
    const postId = data.id || 'unknown'
    
    console.log('[LinkedIn] Post published successfully:', postId)
    
    return {
      success: true,
      postId: postId,
    }
  } catch (error) {
    console.error('[LinkedIn] Publishing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get engagement metrics for a LinkedIn post
 * 
 * Note: LinkedIn analytics API is complex and requires additional setup.
 * This is a stub implementation that returns zeros for now.
 * 
 * @param encryptedToken - Encrypted OAuth 2.0 access token
 * @param postId - LinkedIn post URN (urn:li:share:...)
 * @returns EngagementMetrics with likes, shares, and views
 */
export async function getLinkedInMetrics(
  encryptedToken: string,
  postId: string
): Promise<EngagementMetrics> {
  // TODO: Implement LinkedIn analytics API integration
  // For now, return zeros to avoid breaking the metrics collection pipeline
  console.log('[LinkedIn] Metrics collection not yet implemented for post:', postId)
  
  return {
    likes: 0,
    retweets: 0, // LinkedIn calls these "shares" but we use "retweets" for consistency
    views: 0,
  }
}

/**
 * Get LinkedIn organizations (DISABLED)
 * Company page posting is disabled until LinkedIn approves organization access.
 * This function is kept for backward compatibility but returns empty array.
 *
 * @param accessToken - Raw (unencrypted) access token
 * @returns Empty array (company pages disabled)
 */
export async function getLinkedInOrganizations(accessToken: string): Promise<Array<{
  id: string
  name: string
}>> {
  console.log('[LinkedIn] Company page fetching disabled - personal profile posting only')
  console.log('[LinkedIn] Waiting for LinkedIn approval for organization access')
  return []
}


