import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPdfLib, mockPuppeteerWithPdfBytes, mockCvAggregate } from '@/tests/helpers/pdf'

describe('GET /api/cv/pdf success path', () => {
  const prev = process.env.CHROMIUM_PATH
  beforeEach(() => {
    process.env.CHROMIUM_PATH = '/usr/bin/chromium'
  })
  afterEach(() => {
    process.env.CHROMIUM_PATH = prev
  })

  it('returns 200 with pdf content type', async () => {
    vi.resetModules()
    mockPdfLib(new Uint8Array([0,1,2,3]))
    mockPuppeteerWithPdfBytes(new Uint8Array([0,1,2,3]))
    mockCvAggregate('PDF Success User')
    const { GET } = await import('@/app/api/cv/pdf/route')
    const req = new NextRequest('http://localhost:3000/api/cv/pdf?skills=a,b&projects=x')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/pdf/)
  })
})
