import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto/encryption'
import { validateXCredentials } from '@/lib/oauth/x-oauth1'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const { apiKey, apiSecret, accessToken, accessTokenSecret } = await request.json()
    
    // Validate all credentials are provided
    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      return NextResponse.json({ 
        error: 'All 4 credentials are required: API Key, API Secret, Access Token, Access Token Secret' 
      }, { status: 400 })
    }
    
    console.log('=== Validating X OAuth 1.0a Credentials ===')
    
    // Validate credentials by making a test API call
    let userInfo
    try {
      userInfo = await validateXCredentials({
        apiKey,
        apiSecret,
        accessToken,
        accessTokenSecret,
      })
      console.log('✅ Credentials validated:', userInfo.username)
    } catch (error) {
      console.error('❌ Credential validation failed:', error)
      const message = error instanceof Error ? error.message : 'Invalid credentials'
      return NextResponse.json({ 
        error: `Credential validation failed: ${message}` 
      }, { status: 400 })
    }
    
    // Encrypt all 4 credentials before storing
    console.log('🔐 Encrypting credentials...')
    const encryptedApiKey = encrypt(apiKey)
    const encryptedApiSecret = encrypt(apiSecret)
    const encryptedAccessToken = encrypt(accessToken)
    const encryptedAccessTokenSecret = encrypt(accessTokenSecret)
    
    // Store encrypted credentials in database
    // Store all 4 in access_token field as JSON (we'll add proper columns later if needed)
    const credentialsPayload = {
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      accessToken: encryptedAccessToken,
      accessTokenSecret: encryptedAccessTokenSecret,
    }
    
    console.log('💾 Saving to database...')
    const { error: dbError } = await supabase
      .from('connected_accounts')
      // @ts-expect-error - Supabase type inference issue
      .upsert({
        user_id: user.id,
        platform: 'x',
        platform_user_id: userInfo.id,
        access_token: JSON.stringify(credentialsPayload),
        username: userInfo.username,
        is_active: true,
      }, {
        onConflict: 'user_id,platform'
      })
    
    if (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to save credentials' 
      }, { status: 500 })
    }
    
    console.log('✅ X account connected successfully!')
    console.log('=========================================')
    
    return NextResponse.json({ 
      success: true,
      username: userInfo.username,
      name: userInfo.name,
    })
    
  } catch (error) {
    console.error('❌ Manual connect error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

