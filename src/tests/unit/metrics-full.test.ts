import { describe, it, expect, vi } from 'vitest'

// We want the real metrics module, not any partial mocks declared in other test files.
// Use vi.importActual inside each test to guarantee the actual implementation.

// Helper to safely obtain metric text (prom-client can throw if no metrics)
async function metricsText(renderMetrics: () => Promise<string>) { return (await renderMetrics()) }

describe('metrics.ts comprehensive exercise', () => {
  it('increments counters / gauges / histograms and exposes them', async () => {
    const metrics = await vi.importActual<any>('@/lib/metrics')
    const {
      pdfRequestsTotal,
      permalinkCreatesTotal,
      pdfCacheEntries,
      pdfCacheHitsTotal,
      pdfCacheMissesTotal,
      cvAggregateLoadsTotal,
      cvCacheHitsTotal,
      cvCacheMissesTotal,
      cvStorageBackend,
      exportRequestsTotal,
      exportSuccessTotal,
      exportFailureTotal,
      exportCacheHitTotal,
      exportCacheMissTotal,
      exportPdfSizeBytes,
      authLoginAttemptsTotal,
      authActiveSessions,
      authRateLimiterBackend,
      authLoginBackoffMs,
      authRateLimitFailuresTotal,
      cvEntityMutationsTotal,
      renderMetrics,
    } = metrics

    pdfRequestsTotal.inc({ result: 'success' })
    pdfRequestsTotal.inc({ result: 'error' })
    permalinkCreatesTotal.inc()
    pdfCacheEntries.set(42)
    pdfCacheHitsTotal.inc()
    pdfCacheMissesTotal.inc(2)
    cvAggregateLoadsTotal.inc({ source: 'db' })
    cvAggregateLoadsTotal.inc({ source: 'redis' })
    cvCacheHitsTotal.inc({ backend: 'memory' })
    cvCacheMissesTotal.inc({ backend: 'memory' })
  cvStorageBackend.inc?.()
    authActiveSessions.set(3)
  authRateLimiterBackend.inc?.()
    authLoginAttemptsTotal.inc({ result: 'success' })
    authLoginAttemptsTotal.inc({ result: 'failure' })
    authLoginBackoffMs.set(250)
    authRateLimitFailuresTotal.inc()
    cvEntityMutationsTotal.inc({ entity: 'skill', action: 'create', result: 'success' })
    exportRequestsTotal.inc({ result: 'hit' })
    exportRequestsTotal.inc({ result: 'miss' })
    exportSuccessTotal.inc()
    exportFailureTotal.inc({ reason: 'timeout' })
    exportCacheHitTotal.inc()
    exportCacheMissTotal.inc()

    const h1End = metrics.cvStorageGetDurationSeconds.startTimer?.({ backend: 'memory' })
    h1End?.()
    const h2End = metrics.pdfCacheGetDurationSeconds.startTimer?.({ backend: 'memory' })
    h2End?.()
    const h3End = metrics.pdfGenerationDurationSeconds.startTimer?.({ result: 'success' })
    h3End?.()
    const h4End = metrics.exportDurationSeconds.startTimer?.({ result: 'success' })
    h4End?.()
  exportPdfSizeBytes.observe?.(50_000)

    const text = await metricsText(renderMetrics)
    // Spot check a variety of metrics & labels
    expect(text).toContain('pdf_requests_total')
  // prom-client prints user supplied label order (result then app in our impl)
  expect(text).toMatch(/pdf_requests_total{result="success",app="filip-herceg-cv"} 1/)
    expect(text).toContain('permalink_creates_total')
    expect(text).toMatch(/pdf_cache_entries{app="filip-herceg-cv"} 42/)
    expect(text).toContain('cv_aggregate_loads_total')
    expect(text).toContain('cv_cache_hits_total')
    expect(text).toContain('cv_storage_get_duration_seconds_bucket')
    expect(text).toContain('export_requests_total')
    expect(text).toContain('export_pdf_size_bytes_bucket')
    expect(text).toContain('auth_login_attempts_total')
    expect(text).toContain('cv_entity_mutations_total')
  })

  it('registry.metrics reflects default app label', async () => {
    const { registry } = await vi.importActual<any>('@/lib/metrics')
  // prom-client register.metrics() can be async (Promise<string>) in newer versions.
  const raw = registry.metrics()
  const resolved = raw instanceof Promise ? await raw : raw
  const text = typeof resolved === 'string' ? resolved : String(resolved)
    expect(text).toContain('app="filip-herceg-cv"')
  })
})
