// Direct API implementation - bypassing SDK to ensure v1 endpoint usage
// The @google/generative-ai SDK has issues with v1beta/v1 endpoint selection

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1'

export async function generateWithGemini(
  apiKey: string,
  prompt: string,
  modelName?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required')
  }

  // Safeguard: Use gemini-1.5-flash if model name is missing or invalid
  let validModelName = modelName && modelName.trim() !== '' 
    ? modelName 
    : 'gemini-1.5-flash'
  
  // Remove "models/" prefix if present
  validModelName = validModelName.replace(/^models\//, '')
  
  // Map common model names to correct identifiers
  const modelMap: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-pro': 'gemini-1.5-flash', // Fallback old name to new model
  }
  
  const finalModelName = modelMap[validModelName] || validModelName
  
  // Construct v1 API URL
  const url = `${GEMINI_BASE_URL}/models/${finalModelName}:generateContent?key=${apiKey}`
  
  console.log('[Gemini] API URL:', url.replace(apiKey, 'API_KEY_HIDDEN'))
  console.log('[Gemini] Using model:', finalModelName)
  
  // Prepare request body in v1 format
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini] API Error:', response.status, errorText)
      throw new Error(`Gemini API error (${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    
    // Extract text from v1 API response format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text || text.trim() === '') {
      console.error('[Gemini] Empty response:', JSON.stringify(data))
      throw new Error('Gemini returned empty response')
    }
    
    console.log('[Gemini] Generation successful, length:', text.length)
    return text
    
  } catch (error) {
    console.error('[Gemini] Request failed:', error)
    throw error
  }
}

