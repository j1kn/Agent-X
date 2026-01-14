import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { planNextPost } from '@/lib/pipeline/planner'
import { generatePost } from '@/lib/pipeline/generator'
import { schedulePost } from '@/lib/pipeline/scheduler'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Plan next post
    const plan = await planNextPost(user.id)

    // Log planning success
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'planning',
      status: 'success',
      message: `Planned post for topic: ${plan.topic}`,
      metadata: plan,
    })

    // Generate post
    const { postId, content } = await generatePost(user.id, plan)

    // Log generation success
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'success',
      message: 'Post generated successfully',
      metadata: { post_id: postId },
    })

    // Schedule post
    await schedulePost(postId, plan.scheduledTime)

    // Log scheduling success
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'scheduling',
      status: 'success',
      message: `Post scheduled for ${plan.scheduledTime.toISOString()}`,
      metadata: { post_id: postId },
    })

    return NextResponse.json({
      success: true,
      postId,
      content,
      scheduledFor: plan.scheduledTime.toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
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

