import { describe, it, expect, vi, beforeEach } from 'vitest'

// Covers tracing.ts lines where otelSpan.setAttribute is invoked for setAttribute() calls
// after span creation and for extra attributes passed to end().

describe('tracing otel attribute propagation', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.ENABLE_TRACING = '1'
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://otel-collector'
  })

  it('propagates setAttribute and end(extra) attributes to underlying otel span', async () => {
    const setAttributeCalls: Array<[string, unknown]> = []
    const endCalls: number[] = []
    function mockSpan() {
      return {
        spanContext: () => ({ traceId: 'abc' }),
        setAttribute: (k: string, v: unknown) => { setAttributeCalls.push([k, v]) },
        end: () => { endCalls.push(Date.now()) },
      }
    }
    function mockTracer() { return { startSpan: () => mockSpan() } }
    vi.doMock('@opentelemetry/api', () => ({ trace: { getTracer: () => mockTracer() }, context: { active: () => ({}) } }))
    const { startSpan } = await import('@/lib/tracing')
    const span = startSpan('otel-attr', { phase: 'begin' })
    span.setAttribute('user', 'alice')
    span.setAttribute('count', 2)
    span.end({ result: 'ok', extra: true })
    const keys = setAttributeCalls.map(c => c[0])
    expect(keys).toEqual(expect.arrayContaining(['user', 'count', 'result', 'extra']))
    expect(endCalls.length).toBe(1)
  })
})
