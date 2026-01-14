import OpenAI from 'openai'

export async function generateWithOpenAI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  return completion.choices[0]?.message?.content || ''
}

