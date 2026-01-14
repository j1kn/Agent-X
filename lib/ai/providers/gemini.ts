import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateWithGemini(
  apiKey: string,
  prompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  return text
}

