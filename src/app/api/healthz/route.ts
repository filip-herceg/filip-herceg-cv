import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export function GET() {
  logger.debug({ event: 'healthz' })
  return NextResponse.json({ status: 'ok' })
}
