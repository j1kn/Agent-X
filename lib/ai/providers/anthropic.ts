import Anthropic from '@anthropic-ai/sdk'

export async function generateWithAnthropic(
  apiKey: string,
  prompt: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey })

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }

  return ''
}

