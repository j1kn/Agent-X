import { decrypt } from '@/lib/crypto/encryption'
import type { PublishArgs, PublishResult } from '@/lib/pipeline/types'
import type { EngagementMetrics } from './types'

// 🚨 RULE: Never mutate destructured args or function inputs.
// Always derive new variables (finalContent, finalText, etc).

/**
 * LinkedIn Company Page Posting
 * Uses OAuth 2.0 and UGC (User Generated Content) Posts API
 * 
 * Requirements:
 * - OAuth scopes: r_liteprofile, r_organization_social, w_organization_social
 * - Posts to Company Pages (not personal profiles)
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
 * Publish a text post to LinkedIn Company Page
 * 
 * @param args - PublishArgs object with accessToken, platformUserId, content, tokenExpiresAt
 * @returns PublishResult with success status and post ID
 */
export async function publishToLinkedIn(
  args: PublishArgs
): Promise<PublishResult> {
  // Extract inputs (IMMUTABLE - never reassign)
  const { accessToken: encryptedToken, platformUserId: organizationId, content: rawContent, tokenExpiresAt } = args
  
  if (!organizationId) {
    return {
      success: false,
      error: 'LinkedIn organization ID (platformUserId) is required',
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

    // Build UGC post payload
    const postPayload: LinkedInUGCPost = {
      author: `urn:li:organization:${organizationId}`,
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
          error: 'LinkedIn permission denied. Check organization access and OAuth scopes.',
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
 * Validate LinkedIn connection by fetching organizations
 * Used during OAuth flow to verify token works
 * 
 * @param accessToken - Raw (unencrypted) access token
 * @returns Array of organizations user can post to
 */
export async function getLinkedInOrganizations(accessToken: string): Promise<Array<{
  id: string
  name: string
}>> {
  try {
    console.log('[LinkedIn] Fetching organizations with ADMINISTRATOR role...')
    
    // Use organizationalEntityAcls endpoint (OIDC-compatible)
    const response = await fetch(
      'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    console.log('[LinkedIn] Organizations API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[LinkedIn] Failed to fetch organizations')
      console.error('[LinkedIn] Status:', response.status)
      console.error('[LinkedIn] Response:', errorText)
      throw new Error(`Failed to fetch organizations: ${response.status}`)
    }

    const data = await response.json()
    console.log('[LinkedIn] Organizations response:', JSON.stringify(data, null, 2))
    
    // Parse organization data from LinkedIn's response
    const organizations: Array<{ id: string; name: string }> = []
    
    if (data.elements && Array.isArray(data.elements)) {
      for (const element of data.elements) {
        // Extract organization target
        const orgTarget = element.organizationalTarget
        if (!orgTarget) continue
        
        // Extract organization ID from URN (e.g., "urn:li:organization:12345" -> "12345")
        const orgId = orgTarget.split(':').pop()
        if (!orgId) continue
        
        // Fetch organization details to get name
        try {
          const orgResponse = await fetch(
            `https://api.linkedin.com/v2/organizations/${orgId}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
              },
            }
          )
          
          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            const orgName = orgData.localizedName || orgData.name?.localized?.en_US || `Organization ${orgId}`
            organizations.push({
              id: orgId,
              name: orgName,
            })
            console.log('[LinkedIn] ✓ Found organization:', orgName, `(ID: ${orgId})`)
          } else {
            // If we can't fetch details, still add with ID
            organizations.push({
              id: orgId,
              name: `Organization ${orgId}`,
            })
            console.log('[LinkedIn] ⚠️  Added organization without name (ID: ${orgId})')
          }
        } catch (orgError) {
          console.error('[LinkedIn] Failed to fetch org details for', orgId, orgError)
          // Still add the organization
          organizations.push({
            id: orgId,
            name: `Organization ${orgId}`,
          })
        }
      }
    }

    console.log('[LinkedIn] Total organizations found:', organizations.length)
    return organizations
  } catch (error) {
    console.error('[LinkedIn] Error fetching organizations:', error)
    throw error
  }
}


