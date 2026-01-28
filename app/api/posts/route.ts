import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  // Optimized query - only fetch fields needed for list view
  let query = supabase
    .from('posts')
    .select(`
      id,
      status,
      content,
      topic,
      scheduled_for,
      published_at,
      created_at,
      image_url,
      generation_model,
      connected_accounts!inner (
        platform
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: posts, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: offset + limit < (count || 0)
    }
  })
}


