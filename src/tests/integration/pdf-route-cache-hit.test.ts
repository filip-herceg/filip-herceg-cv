import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPdfLib, mockPuppeteerWithPdfBytes, mockCvAggregate } from '@/tests/helpers/pdf'

describe('GET /api/cv/pdf cache hit branch', () => {
  const prev = process.env.CHROMIUM_PATH
  beforeEach(() => { process.env.CHROMIUM_PATH = '/usr/bin/chromium' })
  afterEach(() => { process.env.CHROMIUM_PATH = prev })

  it('returns HIT on second identical request (cache)', async () => {
  vi.resetModules()
  vi.unmock('puppeteer-core')
  vi.unmock('pdf-lib')
  vi.unmock('@/lib/cv/service')
  vi.clearAllMocks()
    mockPdfLib(new Uint8Array([9,9,9]))
    mockPuppeteerWithPdfBytes(new Uint8Array([9,9,9]))
    mockCvAggregate('PDF Cache User')
    const { GET } = await import('@/app/api/cv/pdf/route')
    const req1 = new NextRequest('http://localhost:3000/api/cv/pdf?skills=a,b')
    const res1 = await GET(req1 as any)
    expect(res1.status).toBe(200)
    expect(res1.headers.get('x-cache')).toBe('MISS')
    const req2 = new NextRequest('http://localhost:3000/api/cv/pdf?skills=a,b')
    const res2 = await GET(req2 as any)
    expect(res2.status).toBe(200)
    expect(res2.headers.get('x-cache')).toBe('HIT')
  })
})
