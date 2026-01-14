import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateWithGemini(
  apiKey: string,
  prompt: string,
  modelName?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Safeguard: Use gemini-1.5-flash if model name is missing or invalid
  const validModelName = modelName && modelName.trim() !== '' 
    ? modelName 
    : 'gemini-1.5-flash'
  
  const model = genAI.getGenerativeModel({ model: validModelName })

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  return text
}

