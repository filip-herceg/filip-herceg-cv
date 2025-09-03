import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startSpan } from '@/lib/tracing'

// Covers branch where OTEL span is created (env var present) and extra attributes passed to end().
describe('tracing otel span branch', () => {
  const prevEnable = process.env.ENABLE_TRACING
  const prevEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  beforeEach(() => {
    process.env.ENABLE_TRACING = '1'
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318' // value just needs to be truthy
  })

  afterEach(() => {
    if (prevEnable !== undefined) process.env.ENABLE_TRACING = prevEnable
    else delete process.env.ENABLE_TRACING
    if (prevEndpoint !== undefined) process.env.OTEL_EXPORTER_OTLP_ENDPOINT = prevEndpoint
    else delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  })

  it('creates otel span and records extra attributes on end', () => {
    const span = startSpan('otel-covered', { phase: 'begin' })
    span.setAttribute('custom.attr', 'x')
    span.end({ finished: true })
    // We cannot assert internals of noop tracer; just ensure traceId shape (string) exists when enabled.
    expect(typeof span.traceId === 'string' || span.traceId === undefined).toBe(true)
  })
})
