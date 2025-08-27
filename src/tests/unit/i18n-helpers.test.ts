import { describe, it, expect } from 'vitest'
import { detectLocaleFromPath, localeFromHeaders } from '@/lib/i18n'

describe('i18n helpers', () => {
  it('detectLocaleFromPath handles german and default', () => {
    expect(detectLocaleFromPath('/de/projects')).toBe('de')
    expect(detectLocaleFromPath('/en')).toBe('en')
    expect(detectLocaleFromPath('/')).toBe('en')
  })

  it('localeFromHeaders returns a supported locale', () => {
    // Smoke test: function should always return one of the supported locales
    expect(['en', 'de']).toContain(localeFromHeaders())
  })
})