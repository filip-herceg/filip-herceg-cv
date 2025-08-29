import { describe, it, expect } from 'vitest'
import { registry, pdfRequestsTotal, permalinkCreatesTotal, pdfCacheEntries, pdfCacheHitsTotal, pdfCacheMissesTotal, renderMetrics } from '../lib/metrics'

describe('metrics exporter', () => {
  it('exposes registered counters and gauge', async () => {
    // increment some counters
    pdfRequestsTotal.inc({ result: 'success' })
    pdfRequestsTotal.inc({ result: 'error' })
    permalinkCreatesTotal.inc()
  pdfCacheEntries.set(3)
  pdfCacheHitsTotal.inc()
  pdfCacheMissesTotal.inc(2)

    const text = await renderMetrics()
    expect(text).toContain('pdf_requests_total')
    expect(text).toContain('permalink_creates_total')
  expect(text).toContain('pdf_cache_entries')
  expect(text).toContain('pdf_cache_hits_total')
  expect(text).toContain('pdf_cache_misses_total')
    // Should include our default label app
    expect(text).toMatch(/app="filip-herceg-cv"/)
    // Ensure result labels rendered
    expect(text).toMatch(/pdf_requests_total{app="filip-herceg-cv",result="success"} 1/)
    expect(text).toMatch(/pdf_requests_total{app="filip-herceg-cv",result="error"} 1/)
  })

  it('registry has expected metrics', () => {
  const text = registry.metrics() as unknown as string
  expect(text).toContain('pdf_requests_total')
  expect(text).toContain('permalink_creates_total')
  expect(text).toContain('pdf_cache_entries')
  })
})
