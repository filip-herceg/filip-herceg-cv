import { NextResponse } from 'next/server'
import { stats } from '@/lib/rum'
import { withRequestContext, logEvent } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const child = withRequestContext(req)
  const s = stats()
  logEvent(child, 'perf:rum.stats', { metrics: Object.keys(s).length })
  return NextResponse.json(s)
}
