import { describe, it, expect } from 'vitest'
import { GET as metricsHandler } from '@/app/api/metrics/route'
import { pdfRequestsTotal, permalinkCreatesTotal } from '@/lib/metrics'

// Minimal mock NextRequest not needed since handler ignores request body/headers

describe('/api/metrics route', () => {
  it('returns prometheus text including our counters', async () => {
    pdfRequestsTotal.inc({ result: 'success' })
    permalinkCreatesTotal.inc()
    const res = await metricsHandler()
    const text = await res.text()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
    expect(text).toContain('pdf_requests_total')
    expect(text).toContain('permalink_creates_total')
  })
})
