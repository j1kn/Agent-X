import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { schedulePost } from '@/lib/pipeline/scheduler'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { postId, scheduledFor } = await request.json()

  if (!postId || !scheduledFor) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    await schedulePost(postId, new Date(scheduledFor))

    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'scheduling',
      status: 'success',
      message: `Post scheduled for ${scheduledFor}`,
      metadata: { post_id: postId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

