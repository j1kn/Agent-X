/**
 * Stability AI Image Generation
 *
 * Uses Stability AI's Stable Image Core API to generate high-quality images
 * from text prompts created by Claude/Gemini.
 *
 * API Documentation: https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1core/post
 */

export interface StabilityImageOptions {
  prompt: string
  apiKey: string
  negativePrompt?: string
  width?: number
  height?: number
}

export interface StabilityImageResult {
  success: boolean
  base64Data?: string
  error?: string
  creditsRemaining?: number
}

/**
 * Generate an image using Stability AI's Stable Image Core API
 */
export async function generateImageWithStability(
  options: StabilityImageOptions
): Promise<StabilityImageResult> {
  const {
    prompt,
    apiKey,
    negativePrompt = 'low quality, blurry, distorted, watermark, text artifacts',
    width = 1024,
    height = 1024,
  } = options

  try {
    console.log('[Stability AI] Generating image with Stable Image Core...')
    console.log('[Stability AI] Prompt:', prompt.substring(0, 100) + '...')
    console.log('[Stability AI] Negative prompt:', negativePrompt)

    // Use the correct Stable Image Core endpoint
    const response = await fetch(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: (() => {
          const formData = new FormData()
          formData.append('prompt', prompt)
          formData.append('negative_prompt', negativePrompt)
          formData.append('aspect_ratio', '1:1')
          formData.append('output_format', 'png')
          return formData
        })(),
      }
    )

    // Log response status and headers for debugging
    console.log('[Stability AI] Response status:', response.status)
    console.log('[Stability AI] Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Stability AI] API Error:', response.status, errorText)
      
      // Parse specific error types
      let errorMessage = `Stability AI API error (${response.status})`
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed - check API key'
      } else if (response.status === 402) {
        errorMessage = 'Out of credits - please add credits to your Stability AI account'
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded - please wait before retrying'
      } else if (response.status === 400) {
        errorMessage = `Bad request - ${errorText}`
      } else {
        errorMessage = `${errorMessage}: ${errorText}`
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    const data = await response.json()
    console.log('[Stability AI] Response data keys:', Object.keys(data))

    // Check for image in response
    if (data.image) {
      const base64Image = data.image
      console.log('[Stability AI] ✓ Image generated successfully!')
      console.log('[Stability AI] Image size:', base64Image.length, 'characters')
      
      // Log credits if available
      if (data.finish_reason) {
        console.log('[Stability AI] Finish reason:', data.finish_reason)
      }

      return {
        success: true,
        base64Data: base64Image,
      }
    }

    console.error('[Stability AI] No image in response:', data)
    return {
      success: false,
      error: 'No image returned from Stability AI',
    }
  } catch (error) {
    console.error('[Stability AI] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate Stability AI API key format
 */
export function validateStabilityApiKey(apiKey: string | null | undefined): {
  valid: boolean
  error?: string
} {
  if (!apiKey) {
    return {
      valid: false,
      error: 'Stability AI API key is not configured',
    }
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      valid: false,
      error: 'Invalid Stability AI API key format (should start with sk-)',
    }
  }

  return { valid: true }
}
