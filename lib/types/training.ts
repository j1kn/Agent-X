/**
 * Training Profile V2 - Extended Structured Training System
 * 
 * This is an OPTIONAL, ADDITIVE structure that extends the existing training system.
 * All fields are optional. If missing, the system falls back to existing behavior.
 */

export interface TrainingProfileV2 {
  brand_identity?: BrandIdentity
  voice_rules?: VoiceRules
  headline_rules?: HeadlineRules
  body_templates?: BodyTemplates
  topics?: Topics
  cta_rules?: CTARules
  image_rules?: ImageRules
  platform_rules?: PlatformRules
  compliance?: Compliance
}

export interface BrandIdentity {
  company_name?: string
  website_url?: string
  short_description?: string
  long_description?: string
  industry?: string
  target_audience?: string
  primary_content_goal?: string
}

export interface VoiceRules {
  writing_style?: string
  sentence_length?: string
  allowed_emotions?: string[]
  disallowed_tone?: string[]
  preferred_phrases?: string[]
  forbidden_phrases?: string[]
}

export interface HeadlineRules {
  allowed_types?: string[]
  max_length?: number
  emoji_allowed?: boolean
  capitalisation_style?: string
}

export interface BodyTemplates {
  educational?: string[]
  announcement?: string[]
  authority?: string[]
}

export interface Topics {
  primary?: string[]
  secondary?: string[]
  forbidden?: string[]
  preferred_keywords?: string[]
}

export interface CTARules {
  allowed_types?: string[]
  placement?: string
  reusable_ctas?: string[]
}

export interface ImageStyleProfile {
  style?: string
  colour_palette?: string[]
  lighting?: string
  mood?: string
  text_on_image?: boolean
  aspect_ratios?: string[]
}

export interface ImageRules {
  decision_logic?: string
  style_profile?: ImageStyleProfile
  prompt_skeleton?: string
}

export interface PlatformRules {
  twitter?: Record<string, unknown>
  telegram?: Record<string, unknown>
  linkedin?: Record<string, unknown>
}

export interface Compliance {
  restricted_claims?: string[]
  forbidden_keywords?: string[]
  mandatory_disclaimers?: string[]
}

/**
 * Validate training_profile_v2 structure (basic type checking)
 * Returns true if valid or null, false if invalid
 */
export function validateTrainingProfileV2(data: unknown): boolean {
  if (data === null || data === undefined) {
    return true
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  // Basic structure validation - just check it's an object
  // We don't enforce required fields since everything is optional
  return true
}

/**
 * Get a safe, validated training profile
 * Returns null if invalid
 */
export function getSafeTrainingProfile(data: unknown): TrainingProfileV2 | null {
  if (!validateTrainingProfileV2(data)) {
    return null
  }
  
  if (data === null || data === undefined) {
    return null
  }

  return data as TrainingProfileV2
}
