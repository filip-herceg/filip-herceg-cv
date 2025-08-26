import { describe, it, expect, vi } from 'vitest'

// Partial mock: keep all original fs exports but force existsSync to return false
vi.mock('fs', async () => {
  const actual: any = await vi.importActual('fs')
  return { ...actual, existsSync: () => false }
})

describe('/api/cv/pdf unsupported (no chromium)', () => {
  it('returns 501 when chromium binary unavailable', async () => {
    const prev = process.env.CHROMIUM_PATH
    delete process.env.CHROMIUM_PATH
    const mod = await import('@/app/api/cv/pdf/route')
    const res = await mod.GET(new Request('http://test/api/cv/pdf') as any)
    expect(res.status).toBe(501)
    if (prev) process.env.CHROMIUM_PATH = prev
  })
})
