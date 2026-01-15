export function validatePostContent(content: string, platform: 'telegram' | 'x'): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Content cannot be empty' }
  }

  if (platform === 'x' && content.length > 280) {
    return { valid: false, error: 'Content exceeds X character limit (280)' }
  }

  if (platform === 'telegram' && content.length > 4096) {
    return { valid: false, error: 'Content exceeds Telegram character limit (4096)' }
  }

  return { valid: true }
}


