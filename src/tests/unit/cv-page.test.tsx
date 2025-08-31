import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock heavy deps before importing the module under test
vi.mock('@/lib/cv/service', () => ({ getAggregate: async (_l: string) => ({ data: { person: { name: 'Test' } }, design: { page: { size: 'A4', columns: 2, gutter: 10 }, public: true } }) }))
vi.mock('@/lib/cv/permalink', () => ({
  decodePreset: async (_t: string) => ({ ok: true, preset: { mode: 'short' } }),
  encodePreset: async (_p: any) => 'token',
  buildPermalink: async (base: string, _p: any) => `${base}?cv=token`,
}))

import { generateMetadata } from '@/app/cv/page'
import { localeFromHeaders } from '@/lib/i18n'

describe('CvPage helpers', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('generateMetadata returns metadata object', async () => {
    const md = await generateMetadata()
    expect(md).toBeTruthy()
    expect(md).toHaveProperty('title')
  })

  it('localeFromHeaders fallback works', () => {
    const l = localeFromHeaders()
    expect(['en','de']).toContain(l)
  })
})
