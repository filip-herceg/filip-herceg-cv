// prom-client is CommonJS; use namespace import
import * as client from 'prom-client'

// Single registry for the app. In serverless/edge scenarios this would need adaptation; here node runtime.
export const registry = new client.Registry()
registry.setDefaultLabels({ app: 'filip-herceg-cv' })
client.collectDefaultMetrics({ register: registry })

export const pdfRequestsTotal = new client.Counter({
  name: 'pdf_requests_total',
  help: 'Total PDF generation requests',
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
  help: 'Count of entries currently stored in the PDF generation cache (placeholder until cache implemented)',
  registers: [registry],
})

// Simple helper to expose metrics (text format)
export async function renderMetrics(): Promise<string> {
  return registry.metrics()
}
