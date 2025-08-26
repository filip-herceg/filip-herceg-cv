import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Force chromium path so unsupported branch not taken
const prev = process.env.CHROMIUM_PATH
beforeEach(() => { process.env.CHROMIUM_PATH = '/usr/bin/chromium' })
afterEach(() => { process.env.CHROMIUM_PATH = prev; vi.resetModules() })

// Reuse pdf-lib minimal mock
vi.mock('pdf-lib', () => ({
  PDFDocument: { load: async (bytes: Uint8Array) => ({ save: async () => bytes, setTitle(){}, setAuthor(){}, setSubject(){}, setKeywords(){} }) }
}))

describe('GET /api/cv/pdf generic error branch', () => {
  it('returns 500 when page.pdf throws non-timeout error', async () => {
    vi.mock('puppeteer-core', () => ({
      launch: vi.fn(async () => ({
        newPage: async () => ({
          setDefaultTimeout: () => {},
          goto: async () => true,
          pdf: async () => { throw new Error('boom render') },
        }),
        close: async () => {},
      })),
    }))
    const { GET } = await import('@/app/api/cv/pdf/route')
    const req = new NextRequest('http://localhost:3000/api/cv/pdf')
    const res = await GET(req as any)
    expect(res.status).toBe(500)
  })
})
