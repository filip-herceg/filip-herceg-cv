import { describe, it, beforeEach, afterEach } from 'vitest'
import { startSpan } from '@/lib/tracing'

// Covers tracing lines where:
//  - tracing enabled but no OTEL exporter => otelSpan undefined (lines assigning attrs without otelSpan)
//  - end() called without extra attributes (branch where extra is falsy)
//  - setAttribute invoked when no otelSpan present
// Remaining uncovered lines in tracing.ts targeted: 22,41,49,65

describe('tracing enabled without otel exporter (no extra end attrs)', () => {
  const prevEnable = process.env.ENABLE_TRACING
  const prevEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  beforeEach(() => {
    process.env.ENABLE_TRACING = '1'
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  })
  afterEach(() => {
    if (prevEnable !== undefined) process.env.ENABLE_TRACING = prevEnable; else delete process.env.ENABLE_TRACING
    if (prevEndpoint !== undefined) process.env.OTEL_EXPORTER_OTLP_ENDPOINT = prevEndpoint; else delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  })
  it('sets attributes and ends without extra payload', () => {
    const span = startSpan('no-exporter', { phase: 'start' })
    span.setAttribute('demo', true)
    // Call end without passing extra (covers branch where extra is undefined)
    span.end()
  })
})
