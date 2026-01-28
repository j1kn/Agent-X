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
  const platform = searchParams.get('platform') || 'telegram'
  const aggregate = searchParams.get('aggregate') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  // Get user's published posts
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
    return NextResponse.json({
      metrics: [],
      aggregates: {
        total_posts: 0,
        total_views: 0,
        total_forwards: 0,
        total_reactions: 0,
        avg_engagement: 0,
        best_score: 0
      }
    })
  }

  // Return aggregated stats if requested
  if (aggregate) {
    const { data: metrics, error } = await supabase
      .from('post_metrics')
      .select('views, forwards, reactions, engagement_score')
      .in('post_id', postIds)
      .eq('platform', platform)

    if (error) {
      console.error('[Metrics API] Error fetching metrics for aggregation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Deduplicate by post_id (keep latest)
    const latestMetrics = metrics?.reduce((acc: any[], metric: any) => {
      const existing = acc.find((m: any) => m.post_id === metric.post_id)
      if (!existing) {
        acc.push(metric)
      }
      return acc
    }, []) || []

    const aggregates = {
      total_posts: latestMetrics.length,
      total_views: latestMetrics.reduce((sum: number, m: any) => sum + (m.views || 0), 0),
      total_forwards: latestMetrics.reduce((sum: number, m: any) => sum + (m.forwards || 0), 0),
      total_reactions: latestMetrics.reduce((sum: number, m: any) => sum + (m.reactions || 0), 0),
      avg_engagement: latestMetrics.length > 0
        ? latestMetrics.reduce((sum: number, m: any) => sum + (m.engagement_score || 0), 0) / latestMetrics.length
        : 0,
      best_score: latestMetrics.length > 0
        ? Math.max(...latestMetrics.map((m: any) => m.engagement_score || 0))
        : 0
    }

    return NextResponse.json({ aggregates })
  }

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
  }

  // Get paginated metrics list
  let query = supabase
    .from('post_metrics')
    .select('*', { count: 'exact' })
    .in('post_id', postIds)
    .eq('platform', platform)

  const { data: metrics, error, count } = await query
    .order('engagement_score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[Metrics API] Error fetching metrics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduplicate by post_id (keep latest)
  const latestMetrics = metrics?.reduce((acc: any[], metric: any) => {
    const existing = acc.find(m => m.post_id === metric.post_id)
    if (!existing) {
      acc.push(metric)
    }
    return acc
  }, [])

  return NextResponse.json({
    metrics: latestMetrics || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: offset + limit < (count || 0)
    }
  })
}
