import { describe, it, expect } from 'vitest'
import { detectLocaleFromPath } from '@/lib/i18n'
import { generateMetadata } from '@/app/page'

describe('coverage bump helpers', () => {
  it('detectLocaleFromPath returns correct locale', () => {
    expect(detectLocaleFromPath('/')).toBe('en')
    expect(detectLocaleFromPath('/de')).toBe('de')
    expect(detectLocaleFromPath('/de/projects')).toBe('de')
    expect(detectLocaleFromPath(undefined)).toBe('en')
  })

  it('generateMetadata returns metadata shape', async () => {
    const md = await generateMetadata()
    expect(md).toBeTruthy()
    expect(md).toHaveProperty('title')
    expect(md).toHaveProperty('openGraph')
  })
})
