import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto/encryption'

export const runtime = 'nodejs'

/**
 * LinkedIn OAuth 2.0 - Save Personal Profile Connection
 *
 * Saves the personal LinkedIn profile connection.
 * Company page posting is disabled until LinkedIn approves organization access.
 *
 * Request body:
 * {
 *   access_token: string,
 *   expires_in: number,
 *   person_id: string,
 *   author_urn: string
 * }
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { access_token, expires_in, person_id, author_urn } = await request.json()

    // Validate required fields
    if (!access_token || !person_id || !author_urn) {
      return NextResponse.json({
        error: 'Missing required fields: access_token, person_id, author_urn'
      }, { status: 400 })
    }

    // Encrypt the access token
    const encryptedToken = encrypt(access_token)

    // Calculate token expiration time
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Save to connected_accounts table (personal profile only)
    const { error: dbError } = await supabase
      .from('connected_accounts')
      // @ts-expect-error - Supabase upsert type inference issue
      .upsert({
        user_id: user.id,
        platform: 'linkedin',
        platform_user_id: person_id,
        access_token: encryptedToken,
        token_expires_at: expiresAt,
        username: 'Personal Profile', // Personal profile - company pages disabled
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

    console.log(`[LinkedIn Save] Successfully connected personal profile (${person_id})`)

    return NextResponse.json({
      success: true,
      profile: {
        id: person_id,
        urn: author_urn,
        type: 'personal'
      }
    })

  } catch (error) {
    console.error('[LinkedIn Save] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save LinkedIn connection' 
    }, { status: 500 })
  }
}


