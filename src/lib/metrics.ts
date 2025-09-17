// prom-client is CJS; Next bundler handles interop so namespace import is fine
import * as client from 'prom-client'
// Work around TS/ESM interop quirk for Histogram class export without using `any`.
// Some bundlers re-export Histogram only on the default export; prefer the named one when present.
// We accept "unknown" then narrow via typeof checks to avoid explicit any.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
// Minimal shape we rely on for histogram constructor.
interface HistogramInstance {
  startTimer?(labels?: Record<string, string>): (additional?: Record<string,string>) => void
}
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type HistogramLikeCtor = new (...args: unknown[]) => HistogramInstance
function resolveHistogram(): HistogramLikeCtor {
  const mod = client as unknown as { Histogram?: unknown; default?: { Histogram?: unknown } }
  const cand = mod.Histogram ?? mod.default?.Histogram
  if (typeof cand === 'function') return cand as HistogramLikeCtor
  throw new Error('Histogram constructor not found in prom-client module')
}
const HistogramCtor = resolveHistogram()

// Single registry for the app. In serverless/edge scenarios this would need adaptation; here node runtime.
export const registry = new client.Registry()
registry.setDefaultLabels({ app: 'filip-herceg-cv' })
if (typeof window === 'undefined') {
  client.collectDefaultMetrics({ register: registry })
}

export const pdfRequestsTotal = new client.Counter({
  name: 'pdf_requests_total',
  help: 'Total PDF generation requests by result',
  labelNames: ['result'] as const,
  registers: [registry],
})

export const permalinkCreatesTotal = new client.Counter({
  name: 'permalink_creates_total',
  help: 'Total permalinks created/copied by users',
  registers: [registry],
})

export const pdfCacheEntries = new client.Gauge({
  name: 'pdf_cache_entries',
  help: 'Number of entries currently held in the PDF cache',
  registers: [registry],
})

export const pdfCacheHitsTotal = new client.Counter({
  name: 'pdf_cache_hits_total',
  help: 'Total PDF cache hits',
  registers: [registry],
})

export const pdfCacheMissesTotal = new client.Counter({
  name: 'pdf_cache_misses_total',
  help: 'Total PDF cache misses',
  registers: [registry],
})

// CV aggregate load counter (labels by source: db | empty | redis)
export const cvAggregateLoadsTotal = new client.Counter({
  name: 'cv_aggregate_loads_total',
  help: 'CV aggregate loads by source (db | empty | redis)',
  labelNames: ['source'] as const,
  registers: [registry],
})

// CV cache hit/miss counters and active backend gauge
export const cvCacheHitsTotal = new client.Counter({
  name: 'cv_cache_hits_total',
  help: 'Total CV cache hits (backend label)',
  labelNames: ['backend'] as const,
  registers: [registry],
})

export const cvCacheMissesTotal = new client.Counter({
  name: 'cv_cache_misses_total',
  help: 'Total CV cache misses (backend label)',
  labelNames: ['backend'] as const,
  registers: [registry],
})

export const cvStorageBackend = new client.Gauge({
  name: 'cv_storage_backend',
  help: 'Active CV storage backend (value=1 for label backend)',
  labelNames: ['backend'] as const,
  registers: [registry],
})

// Latency histograms (seconds)
export const cvStorageGetDurationSeconds = new HistogramCtor({
  name: 'cv_storage_get_duration_seconds',
  help: 'Duration of CV aggregate get() calls by backend',
  labelNames: ['backend'] as const,
  buckets: [0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5],
  registers: [registry],
})

export const pdfCacheGetDurationSeconds = new HistogramCtor({
  name: 'pdf_cache_get_duration_seconds',
  help: 'Duration of PDF cache get() calls by backend',
  labelNames: ['backend'] as const,
  buckets: [0.0005,0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5],
  registers: [registry],
})

export const pdfGenerationDurationSeconds = new HistogramCtor({
  name: 'pdf_generation_duration_seconds',
  help: 'End-to-end duration of PDF route handling by result',
  labelNames: ['result'] as const,
  buckets: [0.05,0.1,0.2,0.5,1,2,5,10,20,30,60],
  registers: [registry],
})

// Export (selective PDF) metrics
export const exportRequestsTotal = new client.Counter({
  name: 'export_requests_total',
  help: 'Total export (selective PDF) generation requests',
  labelNames: ['result'] as const,
  registers: [registry],
})

export const exportSuccessTotal = new client.Counter({
  name: 'export_success_total',
  help: 'Successful exports',
  registers: [registry],
})

export const exportFailureTotal = new client.Counter({
  name: 'export_failure_total',
  help: 'Failed exports by error class',
  labelNames: ['reason'] as const,
  registers: [registry],
})

export const exportCacheHitTotal = new client.Counter({
  name: 'export_cache_hit_total',
  help: 'Export cache hits',
  registers: [registry],
})

export const exportCacheMissTotal = new client.Counter({
  name: 'export_cache_miss_total',
  help: 'Export cache misses',
  registers: [registry],
})

export const exportDurationSeconds = new HistogramCtor({
  name: 'export_duration_seconds',
  help: 'End-to-end export generation duration by result',
  labelNames: ['result'] as const,
  buckets: [0.05,0.1,0.2,0.5,1,2,5,10,20,30,60],
  registers: [registry],
})

// Derive selection latency (very small buckets – internal performance insight)
export const exportSelectionDeriveDurationSeconds = new HistogramCtor({
  name: 'export_selection_derive_duration_seconds',
  help: 'Duration of deriveSelection() execution (seconds)',
  labelNames: ['result'] as const, // result mirrors outer export result for correlation
  buckets: [0.00025,0.0005,0.001,0.002,0.005,0.01,0.02,0.05,0.1],
  registers: [registry],
})

export const exportPdfSizeBytes = new HistogramCtor({
  name: 'export_pdf_size_bytes',
  help: 'Distribution of generated export PDF sizes (bytes)',
  buckets: [5_000,10_000,20_000,40_000,80_000,120_000,200_000,400_000,800_000],
  registers: [registry],
})

// Chromium pool metrics (warm contexts for PDF)
export const chromiumPoolEnabled = new client.Gauge({
  name: 'chromium_pool_enabled',
  help: 'Indicates whether a warm Chromium pool is enabled (1) or not (0)',
  registers: [registry],
})

export const chromiumPoolPagesTotal = new client.Gauge({
  name: 'chromium_pool_pages_total',
  help: 'Total pages tracked by the Chromium pool (busy + available)',
  registers: [registry],
})

export const chromiumPoolPagesBusy = new client.Gauge({
  name: 'chromium_pool_pages_busy',
  help: 'Number of pages currently checked out from the Chromium pool',
  registers: [registry],
})

export const chromiumAcquireDurationSeconds = new HistogramCtor({
  name: 'chromium_acquire_duration_seconds',
  help: 'Time to acquire a Chromium page from the warm pool (seconds)',
  buckets: [0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2],
  registers: [registry],
})

// Additional gauges for better pool observability
export const chromiumPoolPagesAvailable = new client.Gauge({
  name: 'chromium_pool_pages_available',
  help: 'Number of pages currently available in the Chromium pool',
  registers: [registry],
})

export const chromiumPoolMaxCapacity = new client.Gauge({
  name: 'chromium_pool_max_capacity',
  help: 'Configured maximum number of pooled Chromium pages (capacity)',
  registers: [registry],
})

// Auth metrics
export const authLoginAttemptsTotal = new client.Counter({
  name: 'auth_login_attempts_total',
  help: 'Admin auth login attempts by result (success | failure)',
  labelNames: ['result'] as const,
  registers: [registry],
})

export const authActiveSessions = new client.Gauge({
  name: 'auth_active_sessions',
  help: 'Number of active (non-expired) admin sessions',
  registers: [registry],
})

// Rate limiter backend indicator (value always 1 for the active backend with its label)
export const authRateLimiterBackend = new client.Gauge({
  name: 'auth_rate_limiter_backend',
  help: 'Indicates which backend is active for the auth rate limiter',
  labelNames: ['backend'] as const,
  registers: [registry],
})

// Observed backoff delays (ms)
export const authLoginBackoffMs = new client.Gauge({
  name: 'auth_login_backoff_ms',
  help: 'Gauge reporting last applied login backoff delay in milliseconds',
  registers: [registry],
})

// Rate limiter failures (invalid credential attempts)
export const authRateLimitFailuresTotal = new client.Counter({
  name: 'auth_rate_limit_failures_total',
  help: 'Total count of rate limited (failed credential) attempts',
  registers: [registry],
})

// Admin CV entity mutations (CRUD). Labels: entity (skill/project/...), action (create|update|delete), result (success|error)
export const cvEntityMutationsTotal = new client.Counter({
  name: 'cv_entity_mutations_total',
  help: 'Total admin CV entity mutations by entity, action and result',
  labelNames: ['entity', 'action', 'result'] as const,
  registers: [registry],
})

// Simple helper to expose metrics (text format)
export async function renderMetrics(): Promise<string> {
  // Opportunistically parse CI benchmark trend to expose synthetic metric.
  await setBenchSyntheticMetric()
  return registry.metrics()
}

// Synthetic metric for CI bench trend (latest warm p50)
export const pdfBenchWarmP50Seconds = new client.Gauge({
  name: 'pdf_bench_warm_p50_seconds',
  help: 'Latest warm p50 from CI PDF benchmark trend (seconds)',
  labelNames: ['source'] as const,
  registers: [registry],
})

async function setBenchSyntheticMetric(): Promise<void> {
  // Only execute on server
  if (typeof window !== 'undefined') return
  try {
    // Read CSV from repo path. During container/runtime, path is relative to cwd.
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const repoRoot = process.cwd()
    const csvPath = path.join(repoRoot, 'reports', 'bench', 'trend.csv')
    const content = await fs.readFile(csvPath, 'utf8')
    const lines = content.trim().split(/\r?\n/)
    if (lines.length <= 1) return
    // Header: ts,cold_ms,warm_p50_ms,warm_p95_ms,warm_avg_ms,iters
    const header = lines[0].split(',').map(s => s.trim())
    const idx = {
      ts: header.indexOf('ts'),
      warmP50: header.indexOf('warm_p50_ms'),
    }
    if (idx.warmP50 === -1) return
    const last = lines[lines.length - 1]
    const cols = last.split(',')
    const warmP50Ms = Number(cols[idx.warmP50])
    if (!Number.isFinite(warmP50Ms)) return
  const seconds = warmP50Ms / 1000
  pdfBenchWarmP50Seconds.set({ source: 'ci' }, seconds)
  } catch {
    // Best-effort; ignore errors (file missing in non-CI environments)
  }
}
