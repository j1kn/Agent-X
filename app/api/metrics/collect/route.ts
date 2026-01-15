import { NextResponse } from 'next/server'
import { collectMetrics } from '@/lib/pipeline/metrics'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // Verify service role key
  const authHeader = request.headers.get('Authorization')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await collectMetrics()
    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}


