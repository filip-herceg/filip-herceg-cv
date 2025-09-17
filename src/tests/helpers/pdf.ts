import { vi } from 'vitest'

export function mockPdfLib(returnBytes: Uint8Array) {
  vi.doMock('pdf-lib', () => ({
    PDFDocument: {
      load: async () => ({
        setTitle: () => {},
        setAuthor: () => {},
        setSubject: () => {},
        setKeywords: () => {},
        save: async () => returnBytes,
      }),
    },
  // Minimal rgb helper used by route when drawing optional caption
  rgb: (_r: number, _g: number, _b: number) => ({ r: _r, g: _g, b: _b }),
  }))
}

export function mockPuppeteerWithPdfBytes(bytes: Uint8Array) {
  const launchMock = vi.fn().mockResolvedValue({
    newPage: async () => ({
      setDefaultTimeout: () => {},
      goto: async () => ({}),
      pdf: async () => bytes,
    }),
    close: async () => {},
  })
  vi.doMock('puppeteer-core', () => ({ default: { launch: launchMock }, launch: launchMock }))
  return launchMock
}

export function mockPuppeteerErrorPdf(error: Error) {
  vi.doMock('puppeteer-core', () => {
    const page = {
      setDefaultTimeout: () => {},
      goto: async () => true,
      pdf: async () => { throw error },
    }
    const launch = vi.fn(async () => ({ newPage: async () => page, close: async () => {} }))
    return { default: { launch }, launch }
  })
}

export function mockPuppeteerTimeout() {
  vi.doMock('puppeteer-core', () => {
    const page = {
      setDefaultTimeout: () => {},
  goto: async () => { throw new Error('Navigation timeout') },
      pdf: async () => new Uint8Array([0]),
    }
    const launch = vi.fn(async () => ({ newPage: async () => page, close: async () => {} }))
    return { default: { launch }, launch }
  })
}

export function mockCvAggregate(personName = 'Test User') {
  vi.doMock('@/lib/cv/service', () => ({
    getAggregate: async () => ({
      data: { person: { name: personName, title: 'Engineer', profile: '', contact: { email: 't@example.com' }, links: [] }, skills: [], projects: [] },
      design: { page: { size: 'A4' }, palette: {}, typography: {}, shapes: [], sections: [] },
      source: 'db'
    })
  }))
}
