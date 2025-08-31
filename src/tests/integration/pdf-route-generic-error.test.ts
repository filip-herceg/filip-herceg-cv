import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPdfLib, mockPuppeteerErrorPdf, mockCvAggregate } from '@/tests/helpers/pdf'

// Force chromium path so unsupported branch not taken
const prev = process.env.CHROMIUM_PATH
beforeEach(() => { process.env.CHROMIUM_PATH = '/usr/bin/chromium' })
afterEach(() => { process.env.CHROMIUM_PATH = prev; vi.resetModules() })

mockPdfLib(new Uint8Array([1,2,3]))
mockCvAggregate('PDF Error User')

describe('GET /api/cv/pdf generic error branch', () => {
  it('returns 500 when page.pdf throws non-timeout error', async () => {
  vi.resetModules()
  vi.unmock('puppeteer-core')
  vi.unmock('pdf-lib')
  vi.unmock('@/lib/cv/service')
  vi.clearAllMocks()
    mockPdfLib(new Uint8Array([1,2,3]))
    mockCvAggregate('PDF Error User')
    mockPuppeteerErrorPdf(new Error('boom render'))
    const { GET } = await import('@/app/api/cv/pdf/route')
    const req = new NextRequest('http://localhost:3000/api/cv/pdf')
    const res = await GET(req as any)
    expect(res.status).toBe(500)
  })
})
