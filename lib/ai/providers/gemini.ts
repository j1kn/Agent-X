import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateWithGemini(
  apiKey: string,
  prompt: string,
  modelName?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Safeguard: Use gemini-1.5-flash if model name is missing or invalid
  // Ensure model name is in correct format (no "models/" prefix)
  let validModelName = modelName && modelName.trim() !== '' 
    ? modelName 
    : 'gemini-1.5-flash'
  
  // Remove "models/" prefix if present (SDK adds it automatically)
  validModelName = validModelName.replace(/^models\//, '')
  
  // Map common model names to correct identifiers
  const modelMap: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-pro': 'gemini-1.5-flash', // Fallback old name to new model
  }
  
  const finalModelName = modelMap[validModelName] || validModelName
  
  console.log(`[Gemini] Using model: ${finalModelName}`)
  
  const model = genAI.getGenerativeModel({ 
    model: finalModelName,
  })

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  if (!text || text.trim() === '') {
    throw new Error('Gemini returned empty response')
  }

  return text
}

