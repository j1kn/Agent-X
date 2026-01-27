import type { PublishArgs, PublishResult } from '@/lib/pipeline/types'
import type { EngagementMetrics } from './types'

// 🚨 RULE: Never mutate destructured args or function inputs.
// Always derive new variables (finalContent, finalText, etc).

export async function publishToTelegram(
  args: PublishArgs
): Promise<PublishResult> {
  // Extract inputs (IMMUTABLE - never reassign)
  const { accessToken, platformUserId, content, mediaUrls } = args
  
  // Telegram requires NUMERIC chat_id (not @username)
  // chat_id must come from platform_user_id (stored as string, but must be numeric)
  const chatId = platformUserId || ''
  
  // Guard: Ensure chat_id is numeric
  if (!chatId || isNaN(Number(chatId))) {
    const errorMsg = `Telegram chat_id must be numeric. Got: ${chatId || 'undefined'}. Use platform_user_id from connected_accounts.`
    console.error('[Telegram] Invalid chat_id:', { chatId, platformUserId })
    return {
      success: false,
      error: errorMsg,
    }
  }

  const numericChatId = Number(chatId)

  try {
    // Check if we have media to send
    const hasMedia = mediaUrls && mediaUrls.length > 0
    
    if (hasMedia) {
      console.log(`[Telegram] Publishing with ${mediaUrls.length} media attachment(s)`)
      
      // Use sendPhoto for posts with images
      const url = `https://api.telegram.org/bot${accessToken}/sendPhoto`
      
      const requestBody = {
        chat_id: numericChatId,
        photo: mediaUrls[0], // Telegram sendPhoto takes URL directly
        caption: content,
        parse_mode: 'HTML',
      }
      
      console.log('[Telegram] Publishing photo to chat_id:', numericChatId)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.ok) {
        const errorDetails = {
          error_code: data.error_code || 'unknown',
          description: data.description || 'No description provided',
          chat_id: numericChatId,
          response_status: response.status,
          full_response: data,
        }
        
        console.error('[Telegram] API Error:', JSON.stringify(errorDetails, null, 2))
        
        const errorMessage = `Telegram API error (code: ${errorDetails.error_code}): ${errorDetails.description}. chat_id: ${numericChatId}`
        
        return {
          success: false,
          error: errorMessage,
        }
      }
      
      console.log('[Telegram] Photo published successfully:', data.result.message_id)
      
      return {
        success: true,
        postId: data.result.message_id.toString(),
      }
    } else {
      // No media - send text message
      const url = `https://api.telegram.org/bot${accessToken}/sendMessage`

      const requestBody = {
        chat_id: numericChatId,
        text: content,
        parse_mode: 'HTML',
      }

      console.log('[Telegram] Publishing text to chat_id:', numericChatId)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        const errorDetails = {
          error_code: data.error_code || 'unknown',
          description: data.description || 'No description provided',
          chat_id: numericChatId,
          response_status: response.status,
          full_response: data,
        }
        
        console.error('[Telegram] API Error:', JSON.stringify(errorDetails, null, 2))
        
        const errorMessage = `Telegram API error (code: ${errorDetails.error_code}): ${errorDetails.description}. chat_id: ${numericChatId}`
        
        return {
          success: false,
          error: errorMessage,
        }
      }

      console.log('[Telegram] Text published successfully:', data.result.message_id)
      
      return {
        success: true,
        postId: data.result.message_id.toString(),
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Telegram] Exception:', { error: errorMessage, chat_id: numericChatId })
    
    return {
      success: false,
      error: `Telegram publishing exception: ${errorMessage}. chat_id: ${numericChatId}`,
    }
  }
}

export async function getTelegramMetrics(
  accessToken: string,
  chatId: string,
  messageId: string
): Promise<EngagementMetrics> {
  try {
    // Telegram Bot API doesn't provide detailed metrics for channel posts
    // However, we can use getChat and potentially other methods
    // For channels, we need to use the channel's numeric ID (negative for channels)
    
    console.log('[Telegram Metrics] Fetching metrics for message:', { chatId, messageId })
    
    // Note: Telegram Bot API has limited metrics access
    // Views, forwards, and reactions require either:
    // 1. Channel admin rights
    // 2. MTProto API (not Bot API)
    // 3. Telegram Premium API
    
    // For production use, you would need to implement one of these approaches
    // For now, we'll return placeholder metrics that can be populated
    // when proper API access is configured
    
    return {
      likes: 0, // Telegram channels don't have traditional likes
      retweets: 0, // Will be mapped to forwards
      views: 0, // Requires admin access or MTProto
    }
  } catch (error) {
    console.error('[Telegram Metrics] Error fetching metrics:', error)
    return {
      likes: 0,
      retweets: 0,
      views: 0,
    }
  }
}

// Enhanced metrics fetcher for Telegram with proper structure
export async function fetchTelegramPostMetrics(
  accessToken: string,
  chatId: string,
  messageId: string
): Promise<{
  views: number
  forwards: number
  reactions: number
  comments: number
}> {
  try {
    console.log('[Telegram] Fetching detailed metrics for:', { chatId, messageId })
    
    // Attempt to get message statistics
    // Note: This requires the bot to be an admin in the channel
    const url = `https://api.telegram.org/bot${accessToken}/getChat`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.ok) {
      console.warn('[Telegram] Could not fetch chat info:', data.description)
      // Return zeros if we can't fetch metrics
      return {
        views: 0,
        forwards: 0,
        reactions: 0,
        comments: 0,
      }
    }
    
    // For now, return placeholder values
    // In production, you would:
    // 1. Use MTProto to get actual view counts
    // 2. Track reactions via updates
    // 3. Count replies/comments via message threads
    
    return {
      views: 0,
      forwards: 0,
      reactions: 0,
      comments: 0,
    }
  } catch (error) {
    console.error('[Telegram] Error fetching post metrics:', error)
    return {
      views: 0,
      forwards: 0,
      reactions: 0,
      comments: 0,
    }
  }
}

