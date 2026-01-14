/**
 * AI API Key Validation Endpoint
 * 
 * Tests if the provided AI API key is valid by making a test request
 * to the respective AI provider's API.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { provider, api_key } = await request.json()

  if (!provider || !api_key) {
    return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
  }

  try {
    let isValid = false
    let message = ''

    switch (provider) {
      case 'gemini': {
        // Test Gemini API with a simple request
        const url = `${GEMINI_BASE_URL}/models/gemini-1.5-flash-latest:generateContent?key=${api_key}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say "OK" if you can read this.' }] }],
          }),
        })

        if (response.ok) {
          isValid = true
          message = 'Gemini API key is valid'
        } else {
          const error = await response.json()
          message = error.error?.message || 'Invalid Gemini API key'
        }
        break
      }

      case 'openai': {
        // Test OpenAI API
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${api_key}` },
        })

        if (response.ok) {
          isValid = true
          message = 'OpenAI API key is valid'
        } else {
          const error = await response.json()
          message = error.error?.message || 'Invalid OpenAI API key'
        }
        break
      }

      case 'anthropic': {
        // Test Anthropic API with a simple request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say OK' }],
          }),
        })

        if (response.ok) {
          isValid = true
          message = 'Anthropic API key is valid'
        } else {
          const error = await response.json()
          message = error.error?.message || 'Invalid Anthropic API key'
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    return NextResponse.json({ valid: isValid, message })

  } catch (error) {
    console.error('API key validation error:', error)
    return NextResponse.json({
      valid: false,
      message: error instanceof Error ? error.message : 'Validation failed'
    })
  }
}

