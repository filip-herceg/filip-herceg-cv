import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cv/pdf/route'

// Mock puppeteer-core & pdf-lib to isolate route logic
const launchMock = vi.fn().mockResolvedValue({
  newPage: async () => ({
    setDefaultTimeout: () => {},
    goto: async () => ({}),
    pdf: async () => new Uint8Array([0,1,2,3]),
  }),
  close: async () => {},
})

vi.mock('puppeteer-core', () => ({
  default: { launch: launchMock },
  launch: launchMock,
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: async (bytes: Uint8Array) => ({
      setTitle: () => {},
      setAuthor: () => {},
      setSubject: () => {},
      setKeywords: () => {},
      save: async () => bytes,
    }),
  },
}))

describe('GET /api/cv/pdf success path', () => {
  const prev = process.env.CHROMIUM_PATH
  beforeEach(() => {
    process.env.CHROMIUM_PATH = '/usr/bin/chromium'
  })
  afterEach(() => {
    process.env.CHROMIUM_PATH = prev
  })

  it('returns 200 with pdf content type', async () => {
    const req = new NextRequest('http://localhost:3000/api/cv/pdf?skills=a,b&projects=x')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/pdf/)
  })
})
