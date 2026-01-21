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
  channelUsername: string,
  messageId: string
): Promise<EngagementMetrics> {
  // Telegram doesn't provide public API for view counts on channels
  // This would require Telegram Premium API or MTProto
  // For now, return zero metrics
  // In production, you'd need to implement MTProto client or use Telegram's premium API

  return {
    likes: 0, // Telegram channels don't have likes
    retweets: 0, // Telegram has forwards, but not accessible via Bot API
    views: 0, // Would need MTProto for view counts
  }
}

