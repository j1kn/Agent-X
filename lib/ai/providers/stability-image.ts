/**
 * Stability AI Image Generation
 * 
 * Uses Stability AI's SDXL model to generate high-quality images
 * from text prompts created by Gemini.
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
}

/**
 * Generate an image using Stability AI's SDXL model
 */
export async function generateImageWithStability(
  options: StabilityImageOptions
): Promise<StabilityImageResult> {
  const {
    prompt,
    apiKey,
    negativePrompt = 'blurry, bad quality, distorted, ugly, low resolution',
    width = 1024,
    height = 1024,
  } = options

  try {
    console.log('[Stability AI] Generating image...')
    console.log('[Stability AI] Prompt:', prompt.substring(0, 100) + '...')

    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1,
            },
            {
              text: negativePrompt,
              weight: -1,
            },
          ],
          cfg_scale: 7,
          height,
          width,
          steps: 30,
          samples: 1,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Stability AI] API Error:', response.status, errorText)
      
      return {
        success: false,
        error: `Stability AI API error (${response.status}): ${errorText}`,
      }
    }

    const data = await response.json()

    if (data.artifacts && data.artifacts.length > 0) {
      const base64Image = data.artifacts[0].base64
      console.log('[Stability AI] ✓ Image generated successfully!')
      console.log('[Stability AI] Image size:', base64Image.length, 'characters')

      return {
        success: true,
        base64Data: base64Image,
      }
    }

    return {
      success: false,
      error: 'No image artifacts returned from Stability AI',
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
