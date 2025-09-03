import { describe, it, expect, vi } from 'vitest'

// Covers error branch in resolveHistogram() by mocking prom-client without Histogram export.
describe('metrics resolveHistogram throw path', () => {
  it('gracefully falls back when Histogram constructor missing (mocked env)', async () => {
    vi.resetModules()
    vi.doMock('prom-client', () => {
      function Noop() { /* noop ctor */ }
      class Registry { setDefaultLabels() { /* noop */ } metrics() { return '' } }
      // Provide a named Histogram export that is NOT a function so resolveHistogram rejects it.
      const Histogram = {}
      return {
        collectDefaultMetrics: () => {},
        Registry,
        Counter: Noop,
        Gauge: Noop,
        Histogram, // non-callable -> triggers throw in resolveHistogram
      }
    })
    // Under global test-setup metrics mock, import should not throw; ensure module loads.
    const mod = await import('@/lib/metrics')
    expect(mod).toBeTruthy()
  })
})
