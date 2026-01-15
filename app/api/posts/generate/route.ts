import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { planNextPost } from '@/lib/pipeline/planner'
import { generatePost } from '@/lib/pipeline/generator'
import { schedulePost } from '@/lib/pipeline/scheduler'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // #region agent log
  console.log('[DEBUG route.ts:9] API Route ENTRY', {runtime:'nodejs',hasClaudeKey:!!process.env.CLAUDE_API_KEY,vercelEnv:process.env.VERCEL_ENV,nodeEnv:process.env.NODE_ENV,isVercel:!!process.env.VERCEL,vercelUrl:process.env.VERCEL_URL});
  fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/posts/generate/route.ts:9',message:'API Route ENTRY',data:{runtime:'nodejs',hasClaudeKey:!!process.env.CLAUDE_API_KEY,vercelEnv:process.env.VERCEL_ENV,nodeEnv:process.env.NODE_ENV,isVercel:!!process.env.VERCEL,vercelUrl:process.env.VERCEL_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
  // #endregion
  
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/posts/generate/route.ts:17',message:'User authenticated, calling planNextPost',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  try {
    // Plan next post
    const plan = await planNextPost(user.id)

    // Log planning success
    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'planning',
      status: 'success',
      message: `Planned post for topic: ${plan.topic}`,
      metadata: plan,
    })

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/posts/generate/route.ts:32',message:'Before generatePost call',data:{userId:user.id,topic:plan.topic,platform:plan.platform},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    
    // Generate post
    const { postId, content } = await generatePost(user.id, plan)
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/posts/generate/route.ts:33',message:'After generatePost SUCCESS',data:{postId,contentLength:content.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Log generation success
    // @ts-ignore - Supabase type inference issue
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
    // @ts-ignore - Supabase type inference issue
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

    // #region agent log
    console.error('[DEBUG route.ts:64] CATCH BLOCK - Error occurred', {errorMessage,errorStack:error instanceof Error?error.stack:'N/A',hasClaudeKey:!!process.env.CLAUDE_API_KEY});
    fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/posts/generate/route.ts:64',message:'CATCH BLOCK - Error occurred',data:{errorMessage,errorStack:error instanceof Error?error.stack:'N/A',hasClaudeKey:!!process.env.CLAUDE_API_KEY},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C,E'})}).catch(()=>{});
    // #endregion

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

