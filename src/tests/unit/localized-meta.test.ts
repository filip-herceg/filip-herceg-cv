import { describe, it, expect } from 'vitest'
import { localizedMeta } from '@/lib/i18n'

describe('localizedMeta', () => {
  it('builds title/description + og + alternates for home (en)', () => {
    const meta = localizedMeta('en', 'home', { path: '' })
    expect(meta.title).toMatch(/Filip Herceg/)
    expect(meta.openGraph?.locale).toBe('en_US')
    expect(meta.alternates?.languages?.['x-default']).toMatch(/localhost/)
  })
  it('sets german og locale and alternates', () => {
    const meta = localizedMeta('de', 'about', { path: 'about' })
    expect(meta.openGraph?.locale).toBe('de_DE')
    expect(meta.alternates?.languages?.de).toMatch(/\/de\/about$/)
  })
})
