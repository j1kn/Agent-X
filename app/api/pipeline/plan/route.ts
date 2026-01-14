import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { planNextPost } from '@/lib/pipeline/planner'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const plan = await planNextPost(user.id)

    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'planning',
      status: 'success',
      message: `Planned post for topic: ${plan.topic}`,
      metadata: plan,
    })

    return NextResponse.json({ plan })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'planning',
      status: 'error',
      message: errorMessage,
      metadata: { error: errorMessage },
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

