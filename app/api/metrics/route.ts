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
  const platform = searchParams.get('platform') // Optional filter by platform

  if (postId) {
    // Get metrics for a specific post
    const { data: metrics, error } = await supabase
      .from('post_metrics')
      .select(`
        *,
        posts!post_metrics_post_id_fkey (
          id,
          content,
          published_at,
          platform
        )
      `)
      .eq('post_id', postId)
      .order('collected_at', { ascending: false })

    if (error) {
      console.error('[Metrics API] Error fetching post metrics:', error)
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
      console.error('[Metrics API] Error fetching posts:', postsError)
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    const postIds = posts?.map((p: { id: string }) => p.id) || []

    if (postIds.length === 0) {
      return NextResponse.json({ metrics: [] })
    }

    // Build query
    let query = supabase
      .from('post_metrics')
      .select(`
        *,
        posts!post_metrics_post_id_fkey (
          id,
          content,
          published_at,
          platform
        )
      `)
      .in('post_id', postIds)

    // Apply platform filter if provided
    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data: metrics, error } = await query.order('collected_at', { ascending: false })

    if (error) {
      console.error('[Metrics API] Error fetching metrics:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get the latest metric for each post (deduplicate)
    const latestMetrics = metrics?.reduce((acc: any[], metric: any) => {
      const existing = acc.find(m => m.post_id === metric.post_id)
      if (!existing) {
        acc.push(metric)
      }
      return acc
    }, [])

    return NextResponse.json({ metrics: latestMetrics || [] })
  }
}
