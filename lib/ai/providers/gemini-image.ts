import { GoogleGenerativeAI } from '@google/generative-ai'

export interface GeminiImageGenerationOptions {
  prompt: string
  apiKey: string
  postContent: string
}

export interface GeminiImageResult {
  success: boolean
  imageUrl?: string
  base64Data?: string
  imagePrompt?: string
  error?: string
}

/**
 * STRICT IMAGE GENERATION WORKFLOW:
 * 1. Use Claude to generate an image prompt based on post content
 * 2. Use Gemini to generate the actual image from that prompt
 *
 * This function handles the complete image generation pipeline.
 */
export async function generateImageWithGemini(
  options: GeminiImageGenerationOptions
): Promise<GeminiImageResult> {
  try {
    const { postContent, apiKey } = options

    if (!apiKey) {
      throw new Error('Gemini API key is required for image generation')
    }

    console.log('[Gemini Image] Starting strict image generation workflow...')
    
    // STEP 1: Create detailed image prompt using Gemini Pro
    console.log('[Gemini Image] Step 1: Creating image prompt from post content...')
    const imagePrompt = await createImagePromptWithGemini(postContent, apiKey)
    console.log('[Gemini Image] Image prompt created:', imagePrompt)

    // STEP 2: Generate actual image using Gemini's image generation
    console.log('[Gemini Image] Step 2: Generating image with Gemini...')
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Use Gemini's image generation model (Imagen)
    // Note: This requires the Imagen API to be enabled in your Google Cloud project
    try {
      // Attempt to use Gemini's image generation capabilities
      // The actual API endpoint may vary based on Google's latest implementation
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [{
            prompt: imagePrompt,
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9', // Good for social media
            negativePrompt: 'blurry, low quality, distorted',
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Gemini Image] API Error:', errorText)
        
        // Fallback: Return the prompt for manual image generation
        console.log('[Gemini Image] Falling back to prompt-only mode')
        return {
          success: true,
          imagePrompt,
          imageUrl: undefined,
          base64Data: undefined,
          error: 'Image generation API not available, prompt created successfully'
        }
      }

      const data = await response.json()
      
      // Extract image data from response
      const imageData = data.predictions?.[0]?.bytesBase64Encoded
      
      if (imageData) {
        console.log('[Gemini Image] ✓ Image generated successfully!')
        return {
          success: true,
          imagePrompt,
          base64Data: imageData,
          imageUrl: undefined, // Could upload to storage and return URL
        }
      } else {
        throw new Error('No image data in response')
      }

    } catch (imageGenError) {
      console.error('[Gemini Image] Image generation failed:', imageGenError)
      
      // Return the prompt even if image generation fails
      return {
        success: true,
        imagePrompt,
        imageUrl: undefined,
        base64Data: undefined,
        error: `Image prompt created, but generation failed: ${imageGenError instanceof Error ? imageGenError.message : 'Unknown error'}`
      }
    }

  } catch (error) {
    console.error('[Gemini Image] Complete workflow failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * STEP 1: Create an image prompt using Gemini Pro
 * This is called by Claude's workflow to generate a detailed image description
 */
export async function createImagePromptWithGemini(
  postContent: string,
  apiKey: string
): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const prompt = `You are an expert at creating image generation prompts for AI image generators.

Based on this social media post:
"${postContent}"

Create a detailed, vivid image generation prompt that will produce a professional, eye-catching image perfect for social media.

Requirements:
- Describe the main subject clearly
- Include visual style (e.g., "modern digital art", "photorealistic", "minimalist illustration")
- Specify colors and mood
- Mention composition and framing
- Keep it under 150 words
- Make it suitable for 16:9 aspect ratio

Return ONLY the image generation prompt, nothing else.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const imagePrompt = response.text().trim()
    
    // Validate the prompt
    if (!imagePrompt || imagePrompt.length < 10) {
      throw new Error('Generated image prompt is too short or empty')
    }
    
    return imagePrompt

  } catch (error) {
    console.error('[Gemini] Image prompt creation failed:', error)
    throw new Error(`Failed to create image prompt: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate that image generation is properly configured
 */
export function validateImageGenerationConfig(apiKey: string | null | undefined): {
  valid: boolean
  error?: string
} {
  if (!apiKey) {
    return {
      valid: false,
      error: 'Gemini API key is not configured'
    }
  }
  
  if (!apiKey.startsWith('AIza')) {
    return {
      valid: false,
      error: 'Invalid Gemini API key format'
    }
  }
  
  return { valid: true }
}
