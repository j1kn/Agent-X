/**
 * Platform-Specific Content Transformers
 * 
 * Takes master content from Claude and creates optimized variants
 * for each platform WITHOUT calling AI again (deterministic).
 */

export interface PlatformVariants {
  x: string
  telegram: string
  linkedin: string
}

/**
 * Creates platform-specific variants from master content
 */
export function createPlatformVariants(masterContent: string): PlatformVariants {
  return {
    x: optimizeForX(masterContent),
    telegram: optimizeForTelegram(masterContent),
    linkedin: optimizeForLinkedIn(masterContent),
  }
}

/**
 * X (Twitter) Optimization
 * - Max 280 characters
 * - Remove excessive emojis
 * - Strong hook
 * - 1-3 hashtags max
 */
function optimizeForX(content: string): string {
  let xContent = content

  // Remove excessive emojis (keep max 2)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu
  const emojis = xContent.match(emojiRegex) || []
  if (emojis.length > 2) {
    xContent = xContent.replace(emojiRegex, '')
  }

  // Remove multiple line breaks (X prefers concise)
  xContent = xContent.replace(/\n\n+/g, '\n').trim()

  // Truncate to 280 characters if needed
  if (xContent.length > 280) {
    // Try to truncate at sentence boundary
    const lastPeriod = xContent.substring(0, 277).lastIndexOf('.')
    const lastSpace = xContent.substring(0, 277).lastIndexOf(' ')
    
    if (lastPeriod > 200) {
      xContent = xContent.substring(0, lastPeriod + 1)
    } else if (lastSpace > 200) {
      xContent = xContent.substring(0, lastSpace) + '...'
    } else {
      xContent = xContent.substring(0, 277) + '...'
    }
  }

  return xContent
}

/**
 * Telegram Optimization
 * - Can be longer (up to 4096 chars)
 * - Emojis encouraged
 * - Line breaks allowed
 * - Clear CTA tone
 */
function optimizeForTelegram(content: string): string {
  let telegramContent = content

  // Ensure proper spacing for readability
  telegramContent = telegramContent.replace(/\n{3,}/g, '\n\n')

  // Telegram limit is 4096 chars (we're well under that typically)
  if (telegramContent.length > 4000) {
    telegramContent = telegramContent.substring(0, 3997) + '...'
  }

  return telegramContent.trim()
}

/**
 * LinkedIn Optimization
 * - Professional tone
 * - Up to 3000 characters
 * - Hashtags encouraged
 */
function optimizeForLinkedIn(content: string): string {
  let linkedInContent = content

  // Remove casual emojis, keep professional ones
  // For now, keep content as-is

  if (linkedInContent.length > 3000) {
    const lastPeriod = linkedInContent.substring(0, 2997).lastIndexOf('.')
    if (lastPeriod > 2000) {
      linkedInContent = linkedInContent.substring(0, lastPeriod + 1)
    } else {
      linkedInContent = linkedInContent.substring(0, 2997) + '...'
    }
  }

  return linkedInContent.trim()
}

