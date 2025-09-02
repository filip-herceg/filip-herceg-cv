import { NextResponse } from 'next/server'
import { renderMetrics } from '@/lib/metrics'
import { ensureTelemetry } from '@/lib/otel-init'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // Lazy initialize telemetry pipeline (no-op if disabled)
  // Intentionally not awaited for full completion beyond initial setup cost.
  ensureTelemetry()
  const body = await renderMetrics()
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
      'Cache-Control': 'no-store',
    },
  })
}
