import { describe, it, expect, vi, beforeEach } from 'vitest'

// Utility to load module fresh each test
async function importTarget() { return await import('@/lib/pdf/generate') }

describe('generateCvPdf', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.CHROMIUM_PATH
  })

  it('throws no_chromium when no executable found', async () => {
    vi.doMock('fs', () => ({ __esModule: true, existsSync: () => false, default: { existsSync: () => false } }))
    vi.doMock('puppeteer-core', () => ({}))
    const { generateCvPdf } = await importTarget()
    await expect(generateCvPdf('http://x')).rejects.toThrow('no_chromium')
  })

  it('throws pdf_fn_missing when pdf function absent', async () => {
    process.env.CHROMIUM_PATH = '/chrome'
    const close = vi.fn()
    const page = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue({ ok: true }),
      // no pdf function -> triggers branch
    }
    const browser = { newPage: vi.fn().mockResolvedValue(page), close }
  vi.doMock('puppeteer-core', () => ({ launch: vi.fn().mockResolvedValue(browser) }))
	vi.doMock('fs', () => ({ __esModule: true, existsSync: () => true, default: { existsSync: () => true } }))
    // pdf-lib & cv/service still mocked though not reached (pdf_fn_missing happens earlier)
    vi.doMock('pdf-lib', () => ({ PDFDocument: { load: vi.fn() } }))
    vi.doMock('@/lib/cv/service', () => ({ getAggregate: vi.fn() }))
    const { generateCvPdf } = await importTarget()
  await expect(generateCvPdf('http://x')).rejects.toThrow('pdf_fn_missing')
  // Implementation does not call browser.close() before throwing; just assert it was not called to document behavior.
  expect(browser.close).not.toHaveBeenCalled()
  })

  it('returns buffer & person on success path', async () => {
    process.env.CHROMIUM_PATH = '/chrome'
    const captured: Record<string,string | string[]> = {}
    const pdfBytes = new Uint8Array([1,2,3,4])
    const page = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue({ ok: true }),
      pdf: vi.fn().mockResolvedValue(pdfBytes),
    }
    const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn() }
  vi.doMock('puppeteer-core', () => ({ launch: vi.fn().mockResolvedValue(browser) }))
	vi.doMock('fs', () => ({ __esModule: true, existsSync: () => true, default: { existsSync: () => true } }))
    vi.doMock('pdf-lib', () => ({
      PDFDocument: {
        load: vi.fn().mockResolvedValue({
          setTitle: (v: string) => { captured.title = v },
            setAuthor: (v: string) => { captured.author = v },
            setSubject: (v: string) => { captured.subject = v },
            setKeywords: (v: string[]) => { captured.keywords = v },
            save: vi.fn().mockResolvedValue(new Uint8Array([9,9,9])),
        }),
      },
    }))
    vi.doMock('@/lib/cv/service', () => ({ getAggregate: vi.fn().mockResolvedValue({ data: { person: { name: 'Jane Doe', title: 'Engineer' } } }) }))
    const { generateCvPdf } = await importTarget()
    const result = await generateCvPdf('http://target')
    expect(result.person.name).toBe('Jane Doe')
    expect(result.final).toBeInstanceOf(Buffer)
    expect(captured.title).toContain('Jane Doe')
    expect(captured.author).toBe('Jane Doe')
    expect(Array.isArray(captured.keywords)).toBe(true)
    expect(browser.close).toHaveBeenCalled()
  })
})
