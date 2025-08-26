import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Success path mocks
vi.mock('puppeteer-core', () => {
  return {
    launch: vi.fn(async () => ({
      newPage: async () => ({
        setDefaultTimeout: () => {},
        goto: async () => true,
        pdf: async () => new Uint8Array([37, 80, 68, 70]), // %PDF
      }),
      close: async () => {},
    })),
  }
})

vi.mock('pdf-lib', () => {
  return {
    PDFDocument: {
      load: async () => ({
        setTitle: () => {},
        setAuthor: () => {},
        setSubject: () => {},
        setKeywords: () => {},
        save: async () => new Uint8Array([1, 2, 3, 4]),
      }),
    },
  }
})

// Route under test AFTER mocks
import { GET } from '@/app/api/cv/pdf/route'

describe('GET /api/cv/pdf', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...origEnv }
    vi.resetModules()
  })

  beforeEach(() => {
    process.env.CHROMIUM_PATH = '/tmp/chrome'
  })

  it('returns a PDF (200) with inline disposition when chromium path present', async () => {
    const headers = new Headers({ host: 'localhost:3000' })
    const req = { url: 'http://localhost:3000/api/cv/pdf?skills=ts,react&mode=short', headers } as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toMatch(/inline; filename=/)
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.length).toBeGreaterThan(0)
  })

  it('returns 501 when no chromium binary available', async () => {
    delete process.env.CHROMIUM_PATH
    vi.resetModules()
    // Re-mock dependencies after reset
    vi.mock('puppeteer-core', () => ({
      launch: vi.fn(async () => ({
        newPage: async () => ({
          setDefaultTimeout: () => {},
          goto: async () => true,
          pdf: async () => new Uint8Array([37, 80, 68, 70]),
        }),
        close: async () => {},
      })),
    }))
    vi.mock('pdf-lib', () => ({
      PDFDocument: {
        load: async () => ({
          setTitle: () => {},
          setAuthor: () => {},
          setSubject: () => {},
          setKeywords: () => {},
          save: async () => new Uint8Array([1, 2, 3, 4]),
        }),
      },
    }))
    // Provide a partial mock of fs retaining shape (vitest expects default when ESM transformed)
    vi.mock('fs', async (importOriginal) => {
      const actual: any = await importOriginal()
      return {
        ...actual,
        existsSync: () => false,
        default: {
          ...actual.default,
          existsSync: () => false,
        },
      }
    })
    const { GET: GETNoChrome } = await import('@/app/api/cv/pdf/route')
    const headers = new Headers({ host: 'localhost:3000' })
    const req = { url: 'http://localhost:3000/api/cv/pdf', headers } as any
    const res = await GETNoChrome(req)
    expect(res.status).toBe(501)
    const json = await res.json()
    expect(json.status).toBe(501)
  })
})
