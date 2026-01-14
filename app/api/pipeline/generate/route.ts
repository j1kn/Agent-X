import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generatePost } from '@/lib/pipeline/generator'
import type { PlanningResult } from '@/lib/pipeline/planner'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan: PlanningResult = await request.json()

  if (!plan || !plan.topic || !plan.accountId) {
    return NextResponse.json({ error: 'Invalid plan data' }, { status: 400 })
  }

  try {
    const result = await generatePost(user.id, plan)

    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'success',
      message: 'Post generated successfully',
      metadata: { post_id: result.postId },
    })

    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

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

