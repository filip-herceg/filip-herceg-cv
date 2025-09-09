import { describe, it, expect, vi, beforeEach } from 'vitest'

// Invalidate any existing PDF cache between tests to avoid cache-hit 200 masking unsupported path
vi.mock('@/lib/pdf-cache', async () => {
  const actual: any = await vi.importActual('@/lib/pdf-cache')
  // proxy but force a fresh in-memory instance per import with cleared state
  return {
    ...actual,
    pdfCache: new actual.PdfCache({ maxEntries: 1, ttlMs: 1 })
  }
})

// Ensure no candidate Chromium paths are considered available
vi.mock('@/lib/constants', async () => {
  const actual: any = await vi.importActual('@/lib/constants')
  return { ...actual, CHROMIUM_CANDIDATE_PATHS: [] as string[] }
})

// Partial mock: keep all original fs exports but force existsSync to return false
vi.mock('fs', async () => {
  const actual: any = await vi.importActual('fs')
  return { ...actual, existsSync: () => false }
})

describe('/api/cv/pdf unsupported (no chromium)', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  it('returns 501 when chromium binary unavailable', async () => {
    const prev = process.env.CHROMIUM_PATH
    delete process.env.CHROMIUM_PATH
    const mod = await import('@/app/api/cv/pdf/route')
    const res = await mod.GET(new Request('http://test/api/cv/pdf') as any)
    expect(res.status).toBe(501)
    if (prev) process.env.CHROMIUM_PATH = prev
  })
})
