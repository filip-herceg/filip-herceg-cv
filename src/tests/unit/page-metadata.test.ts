import { describe, it, expect } from 'vitest'
import { localizedMeta } from '@/lib/i18n'

describe('generateMetadata helpers', () => {
  it('home en metadata has og + alternates', () => {
    const meta = localizedMeta('en', 'home')
    expect(meta.title).toContain('Filip')
    expect(meta.openGraph?.locale).toBe('en_US')
    expect(meta.alternates?.languages?.['de']).toMatch(/\/de$/)
  })
  it('projects de metadata path + og locale', () => {
    const meta = localizedMeta('de', 'projects', { path: 'projects' })
    expect(meta.openGraph?.locale).toBe('de_DE')
    expect(meta.alternates?.canonical).toMatch(/projects$/)
  })
})