import { NextResponse } from 'next/server'
import { stats } from '@/lib/rum'
import { withRequestContext, logEvent } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Overload to satisfy any stale compiled references (tests always pass a Request)
export async function GET(): Promise<Response>
export async function GET(req: Request): Promise<Response>
export async function GET(req?: Request): Promise<Response> {
  const child = withRequestContext(req)
  const s = stats()
  logEvent(child, 'perf:rum.stats', { metrics: Object.keys(s).length })
  return NextResponse.json(s)
}
