import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'

// Counters to assert side-effects
let exporterInits = 0

// Stable mocks for OTEL deps so we don't pull real implementations
vi.mock('@opentelemetry/sdk-trace-node', () => ({
  NodeTracerProvider: class {
    resource: unknown
    processors: unknown[] = []
    constructor(opts: any) { this.resource = opts.resource }
    addSpanProcessor(p: unknown) { this.processors.push(p) }
    register() { (globalThis as any).__otel_registered = ((globalThis as any).__otel_registered || 0) + 1 }
  }
}))
vi.mock('@opentelemetry/sdk-trace-base', () => ({
  BatchSpanProcessor: class { constructor(public exporter: unknown) {} }
}))
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: function MockExporter(this: any) { exporterInits += 1 }
}))

describe('otel-init initOpenTelemetry', () => {
  const orig = { ENABLE_TRACING: process.env.ENABLE_TRACING, OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }
  beforeEach(() => {
    vi.resetModules()
    exporterInits = 0
    delete process.env.ENABLE_TRACING
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ;(globalThis as any).__otel_registered = 0
  })
  afterAll(() => {
    if (orig.ENABLE_TRACING !== undefined) process.env.ENABLE_TRACING = orig.ENABLE_TRACING
    else delete process.env.ENABLE_TRACING
    if (orig.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined) process.env.OTEL_EXPORTER_OTLP_ENDPOINT = orig.OTEL_EXPORTER_OTLP_ENDPOINT
    else delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  })

  it('returns early when tracing disabled', async () => {
    const { ensureTelemetry } = await import('@/lib/otel-init')
    await ensureTelemetry()
    expect(exporterInits).toBe(0)
    expect((globalThis as any).__otel_registered).toBe(0)
  })

  it('returns early when enabled but no endpoint', async () => {
    process.env.ENABLE_TRACING = '1'
    const { ensureTelemetry } = await import('@/lib/otel-init')
    await ensureTelemetry()
    expect(exporterInits).toBe(0)
  })

  it('initializes once when enabled with endpoint', async () => {
    process.env.ENABLE_TRACING = '1'
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318'
    const { ensureTelemetry } = await import('@/lib/otel-init')
    await ensureTelemetry()
    await ensureTelemetry() // idempotent
    expect(exporterInits).toBe(1)
    expect((globalThis as any).__otel_registered).toBe(1)
  })

  it('logs an error when exporter constructor throws', async () => {
    // Override only this test with throwing exporter
    vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
      OTLPTraceExporter: function ThrowingExporter(this: any) { throw new Error('boom') }
    }))
    process.env.ENABLE_TRACING = '1'
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318'
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ensureTelemetry } = await import('@/lib/otel-init')
    await ensureTelemetry()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
