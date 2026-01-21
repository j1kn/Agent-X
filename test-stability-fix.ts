/**
 * Test Script for Stability AI Image Generation Fix
 * 
 * This script tests the corrected Stability AI integration
 * to verify that images are generated successfully.
 * 
 * Run with: npx tsx test-stability-fix.ts
 */

import { generateImageWithStability } from './lib/ai/providers/stability-image'

async function testStabilityAI() {
  console.log('=== Testing Stability AI Image Generation ===\n')
  
  // Check for API key
  const apiKey = process.env.STABILITY_API_KEY
  
  if (!apiKey) {
    console.error('❌ STABILITY_API_KEY not found in environment variables')
    console.error('Please set it in your .env.local file')
    process.exit(1)
  }
  
  console.log('✓ API key found')
  console.log(`✓ Key format: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`)
  console.log()
  
  // Test prompt
  const testPrompt = 'A minimalist, futuristic illustration representing AI-driven social media automation, dark background, neon accents, clean composition, professional tech aesthetic'
  
  console.log('Test Prompt:')
  console.log(testPrompt)
  console.log()
  
  console.log('Calling Stability AI API...')
  console.log('Endpoint: https://api.stability.ai/v2beta/stable-image/generate/core')
  console.log('Model: stable-image-core')
  console.log('Aspect Ratio: 1:1 (1024x1024)')
  console.log()
  
  const startTime = Date.now()
  
  try {
    const result = await generateImageWithStability({
      prompt: testPrompt,
      apiKey,
    })
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log(`\n⏱️  Request completed in ${duration}s\n`)
    
    if (result.success && result.base64Data) {
      console.log('✅ SUCCESS - Image generated!')
      console.log(`✓ Base64 data length: ${result.base64Data.length} characters`)
      console.log(`✓ Estimated size: ~${Math.round(result.base64Data.length * 0.75 / 1024)} KB`)
      
      if (result.creditsRemaining !== undefined) {
        console.log(`✓ Credits remaining: ${result.creditsRemaining}`)
      }
      
      console.log('\n✅ TEST PASSED - Stability AI integration is working correctly!')
      console.log('\nNext steps:')
      console.log('1. The image generation will now work in your autopilot workflow')
      console.log('2. Images will be generated when scheduled according to your image_times config')
      console.log('3. Check the pipeline_logs table for detailed generation logs')
      
    } else {
      console.error('❌ FAILED - No image returned')
      console.error('Error:', result.error)
      
      console.log('\n🔍 Debugging information:')
      
      if (result.error?.includes('401')) {
        console.log('→ Authentication failed')
        console.log('→ Check that your STABILITY_API_KEY is correct')
        console.log('→ Get your key from: https://platform.stability.ai/account/keys')
      } else if (result.error?.includes('402')) {
        console.log('→ Out of credits')
        console.log('→ Add credits at: https://platform.stability.ai/account/credits')
      } else if (result.error?.includes('429')) {
        console.log('→ Rate limit exceeded')
        console.log('→ Wait a moment and try again')
      } else if (result.error?.includes('400')) {
        console.log('→ Bad request - payload issue')
        console.log('→ This should not happen with the fixed code')
      }
      
      process.exit(1)
    }
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n⏱️  Request failed after ${duration}s\n`)
    
    console.error('❌ EXCEPTION:', error)
    
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    
    process.exit(1)
  }
}

// Run the test
testStabilityAI()
