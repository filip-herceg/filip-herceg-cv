import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { record } from '@/lib/rum'

const vitalsSchema = z.object({
  name: z.string(),
  value: z.number(),
  id: z.string().optional(),
  navigationType: z.string().optional(),
  rating: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = vitalsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid metric' }, { status: 400 })
    }
  logger.debug({ event: 'web-vitals', metric: parsed.data })
  record(parsed.data)
  } catch (e) {
    logger.warn({ event: 'web-vitals.error', err: e })
  }
  return NextResponse.json({ ok: true })
}
