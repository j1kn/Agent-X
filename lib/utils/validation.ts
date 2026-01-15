import { Platform, PLATFORM_LIMITS } from '@/lib/types/platform'

export function validatePostContent(
  content: string,
  platform: Platform
): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Content cannot be empty' }
  }

  const limit = PLATFORM_LIMITS[platform]
  
  switch (platform) {
    case 'x':
      if (content.length > limit) {
        return { valid: false, error: `Content exceeds X character limit (${limit})` }
      }
      break

    case 'telegram':
      if (content.length > limit) {
        return { valid: false, error: `Content exceeds Telegram character limit (${limit})` }
      }
      break

    case 'linkedin':
      if (content.length > limit) {
        return { valid: false, error: `Content exceeds LinkedIn character limit (${limit})` }
      }
      break

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = platform
      return { valid: false, error: `Unsupported platform: ${_exhaustive}` }
  }

  return { valid: true }
}


