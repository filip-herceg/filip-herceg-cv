import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withRequestContext, logEvent, logError } from '@/lib/logger'
import { record } from '@/lib/rum'

const vitalsSchema = z.object({
  name: z.string(),
  value: z.number(),
  id: z.string().optional(),
  navigationType: z.string().optional(),
  rating: z.string().optional(),
})

export async function POST(req: Request) {
  const child = withRequestContext(req)
  try {
    const body = await req.json()
    const parsed = vitalsSchema.safeParse(body)
    if (!parsed.success) {
      logEvent(child, 'perf:rum.metric.invalid')
      return NextResponse.json({ error: 'invalid metric' }, { status: 400 })
    }
    record(parsed.data)
    logEvent(child, 'perf:rum.metric', { name: parsed.data.name, value: parsed.data.value })
  } catch (e) {
    logError(child, 'perf:rum.metric.error', e as Error)
  }
  return NextResponse.json({ ok: true })
}
