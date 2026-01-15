import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generatePost } from '@/lib/pipeline/generator'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic } = await request.json()

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
  }

  try {
    // Generate master post + platform variants + schedule all
    const result = await generatePost(user.id, topic)

    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'success',
      message: `Generated ${result.posts.length} posts for ${result.posts.map(p => p.platform).join(', ')}`,
      metadata: {
        master_content: result.masterContent,
        posts: result.posts.map(p => ({ platform: p.platform, post_id: p.postId })),
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'error',
      message: errorMessage,
      metadata: { error: errorMessage },
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

