// prom-client is CJS; Next bundler handles interop so namespace import is fine
import * as client from 'prom-client'

// Single registry for the app. In serverless/edge scenarios this would need adaptation; here node runtime.
export const registry = new client.Registry()
registry.setDefaultLabels({ app: 'filip-herceg-cv' })
client.collectDefaultMetrics({ register: registry })

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

// CV aggregate load counter (labels by source: db | empty)
export const cvAggregateLoadsTotal = new client.Counter({
  name: 'cv_aggregate_loads_total',
  help: 'CV aggregate loads by source (db | empty)',
  labelNames: ['source'] as const,
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
  return registry.metrics()
}
