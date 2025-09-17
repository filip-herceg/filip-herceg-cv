import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CV_PAGE_SIZE } from '@/lib/constants'

const SAMPLE_PDF_BYTES = new Uint8Array([37, 80, 68, 70]) // %PDF header
const SAMPLE_MUTATED_BYTES = new Uint8Array([1, 2, 3, 4])

// Success path mocks
vi.mock('puppeteer-core', () => {
  return {
    launch: vi.fn(async () => ({
      newPage: async () => ({
        setDefaultTimeout: () => {},
        goto: async () => true,
        pdf: async () => SAMPLE_PDF_BYTES,
      }),
      close: async () => {},
    })),
  }
})

// Capture route errors
const __capturedErrors: any[] = []
vi.mock('@/lib/logger', async () => {
  const actual: any = await vi.importActual('@/lib/logger')
  return {
    ...actual,
    logError: (_base: any, event: string, err: unknown, fields: Record<string, unknown> = {}) => {
      // eslint-disable-next-line no-console
      console.error('captured-route-error', event, (err as any)?.message)
      __capturedErrors.push({ event, err, fields })
    }
  }
})

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: async () => ({
      setTitle: () => {},
      setAuthor: () => {},
      setSubject: () => {},
      setKeywords: () => {},
      save: async () => SAMPLE_MUTATED_BYTES,
    }),
  },
  rgb: (_r: number, _g: number, _b: number) => ({ r: _r, g: _g, b: _b }),
}))

// Mock aggregate service to avoid hitting Prisma in tests
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({
    data: { person: { name: 'Test User', title: 'Engineer', profile: '', contact: { email: 't@example.com' }, links: [] }, skills: [], projects: [] },
  design: { page: { size: CV_PAGE_SIZE }, palette: {}, typography: {}, shapes: [], sections: [] },
    source: 'db'
  })
}))

let GET: any

describe('GET /api/cv/pdf', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...origEnv }
    vi.resetModules()
  })

  beforeEach(async () => {
    process.env.CHROMIUM_PATH = '/tmp/chrome'
    // Import route after environment + mocks in place
    const mod = await import('@/app/api/cv/pdf/route')
    GET = mod.GET
  })

  it('returns a PDF (200) with inline disposition when chromium path present', async () => {
    const headers = new Headers({ host: 'localhost:3000' })
    const req = { url: 'http://localhost:3000/api/cv/pdf?skills=ts,react&mode=short', headers } as any
    const res = await GET(req)
    if (res.status !== 200) {
      try {
        const j = await res.json()
        // eslint-disable-next-line no-console
        console.error('PDF route debug payload', j)
      } catch {}
    }
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toMatch(/inline; filename=/)
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.length).toBeGreaterThan(0)
  })

  it('returns 501 when no chromium binary available', async () => {
    delete process.env.CHROMIUM_PATH
    vi.resetModules()
    // Non-hoisted mocks (doMock) so they don't leak into earlier test
  vi.doMock('fs', async (importOriginal) => {
      const actual: any = await importOriginal()
      return { ...actual, existsSync: () => false, default: { ...actual.default, existsSync: () => false } }
    })
    const { GET: GETNoChrome } = await import('@/app/api/cv/pdf/route')
    const headers = new Headers({ host: 'localhost:3000' })
    const req = { url: 'http://localhost:3000/api/cv/pdf', headers } as any
    const res = await GETNoChrome(req)
    expect(res.status).toBe(501)
    const json = await res.json()
    expect(json.status).toBe(501)
  // ensure no unexpected captured route errors for unsupported path
  expect(__capturedErrors.find(e => e.event === 'domain:cv.pdf.error')).toBeUndefined()
  })
})
