// Telegram Bot API - Bot Token flow for channel posting
// https://core.telegram.org/bots/api

export interface TelegramBotInfo {
  ok: boolean
  result: {
    id: number
    is_bot: boolean
    first_name: string
    username: string
    can_join_groups: boolean
    can_read_all_group_messages: boolean
    supports_inline_queries: boolean
  }
}

export interface TelegramChatInfo {
  ok: boolean
  result: {
    id: number
    title: string
    username?: string
    type: string
  }
}

/**
 * Verify bot token is valid by calling getMe
 */
export async function verifyBotToken(botToken: string): Promise<TelegramBotInfo> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
  const data = await response.json()
  
  if (!data.ok) {
    throw new Error('Invalid bot token')
  }
  
  return data
}

/**
 * Get chat info by username (channel or group)
 */
export async function getChatInfo(
  botToken: string,
  channelUsername: string
): Promise<TelegramChatInfo> {
  // Remove @ if present
  const username = channelUsername.startsWith('@') 
    ? channelUsername.substring(1) 
    : channelUsername
  
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChat?chat_id=@${username}`
  )
  const data = await response.json()
  
  if (!data.ok) {
    throw new Error('Cannot access channel - ensure bot is added as admin')
  }
  
  return data
}

/**
 * Check if bot is an admin in the channel
 */
export async function checkBotIsAdmin(
  botToken: string,
  chatId: number,
  botId: number
): Promise<boolean> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${botId}`
  )
  const data = await response.json()
  
  if (!data.ok) {
    return false
  }
  
  const status = data.result.status
  return status === 'administrator' || status === 'creator'
}

