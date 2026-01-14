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
  const postId = searchParams.get('postId')

  if (postId) {
    // Get metrics for a specific post
    const { data: metrics, error } = await supabase
      .from('post_metrics')
      .select('*')
      .eq('post_id', postId)
      .order('collected_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ metrics })
  } else {
    // Get all metrics for user's posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'published')

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    const postIds = posts?.map(p => p.id) || []

    if (postIds.length === 0) {
      return NextResponse.json({ metrics: [] })
    }

    const { data: metrics, error } = await supabase
      .from('post_metrics')
      .select('*')
      .in('post_id', postIds)
      .order('collected_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ metrics })
  }
}

