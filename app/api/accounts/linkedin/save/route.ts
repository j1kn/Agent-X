import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto/encryption'

export const runtime = 'nodejs'

/**
 * LinkedIn OAuth 2.0 - Save Selected Organization
 * 
 * After user selects which Company Page to connect,
 * this endpoint encrypts and stores the access token.
 * 
 * Request body:
 * {
 *   access_token: string,
 *   expires_in: number,
 *   organization_id: string,
 *   organization_name: string
 * }
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { access_token, expires_in, organization_id, organization_name } = await request.json()

    // Validate required fields
    if (!access_token || !organization_id || !organization_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: access_token, organization_id, organization_name' 
      }, { status: 400 })
    }

    // Encrypt the access token
    const encryptedToken = encrypt(access_token)

    // Calculate token expiration time
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Save to connected_accounts table
    const { error: dbError } = await supabase
      .from('connected_accounts')
      // @ts-expect-error - Supabase upsert type inference issue
      .upsert({
        user_id: user.id,
        platform: 'linkedin',
        platform_user_id: organization_id,
        access_token: encryptedToken,
        token_expires_at: expiresAt,
        username: organization_name,
        is_active: true,
      }, {
        onConflict: 'user_id,platform',
      })

    if (dbError) {
      console.error('[LinkedIn Save] Database error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to save LinkedIn connection' 
      }, { status: 500 })
    }

    console.log(`[LinkedIn Save] Successfully connected: ${organization_name} (${organization_id})`)

    return NextResponse.json({ 
      success: true,
      organization: {
        id: organization_id,
        name: organization_name,
      }
    })

  } catch (error) {
    console.error('[LinkedIn Save] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save LinkedIn connection' 
    }, { status: 500 })
  }
}


