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

// Simple helper to expose metrics (text format)
export async function renderMetrics(): Promise<string> {
  return registry.metrics()
}
