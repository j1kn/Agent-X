/**
 * Platform Type - Single Source of Truth
 * 
 * All platform references across the codebase should use this type.
 * Adding a new platform? Add it here once, and TypeScript ensures
 * all validation, transformers, and publishers are updated.
 */

export type Platform = 'x' | 'telegram' | 'linkedin'

/**
 * Platform display names for UI
 */
export const PLATFORM_NAMES: Record<Platform, string> = {
  x: '𝕏 Twitter',
  telegram: '✈️ Telegram',
  linkedin: '💼 LinkedIn',
}

/**
 * Platform character limits
 */
export const PLATFORM_LIMITS: Record<Platform, number> = {
  x: 280,
  telegram: 4096,
  linkedin: 3000,
}

