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

  try {
    // Log planning success
    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'planning',
      status: 'success',
      message: 'Starting post generation using training data',
      metadata: { withImage: false },
    })

    // Generate master post + platform variants + schedule all
    const result = await generatePost(user.id)

    // Log generation success with all posts
    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'success',
      message: `Generated ${result.posts.length} posts for ${result.posts.map(p => p.platform).join(', ')}`,
      metadata: {
        master_content: result.masterContent,
        posts: result.posts.map(p => ({
          platform: p.platform,
          post_id: p.postId,
          scheduled_for: p.scheduledFor,
        })),
      },
    })

    return NextResponse.json({
      success: true,
      masterContent: result.masterContent,
      posts: result.posts.map(p => ({
        postId: p.postId,
        platform: p.platform,
        content: p.content,
        scheduledFor: p.scheduledFor.toISOString(),
      })),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
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

