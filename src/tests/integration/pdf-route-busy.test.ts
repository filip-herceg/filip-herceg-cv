import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('GET /api/cv/pdf busy SLA guard', () => {
  const REAL_ENV = { ...process.env }
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...REAL_ENV, CHROMIUM_PATH: undefined as any }
  })
  afterEach(() => {
    process.env = REAL_ENV
  })

  it('returns 503 with Retry-After when pool acquire exceeds SLA', async () => {
    // Mock chromium pool: warm is no-op, acquire never resolves within test window
    const pending = () => new Promise<never>(() => { /* never resolve */ })
    vi.doMock('@/lib/pdf/chromium-pool', () => ({
      warmChromiumPool: vi.fn().mockResolvedValue(undefined),
      acquirePooledPage: vi.fn().mockImplementation(pending),
    }))
    // Constants: ensure SLA is small for deterministic test
    vi.doMock('@/lib/constants', async (importActual) => {
      const actual = await importActual<any>()
      return { ...actual, PDF_POOL_ACQUIRE_SLA_MS: 10, PDF_RETRY_AFTER_SECONDS: 1 }
    })

    const { GET } = await import('@/app/api/cv/pdf/route')
    const req = new NextRequest('http://localhost:3000/api/cv/pdf')
    const res = await GET(req as any)
    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('1')
    const body = await res.text()
    expect(body).toContain('busy')
  })
})
