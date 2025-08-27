import { describe, it, expect } from 'vitest'
import { tAsync } from '@/lib/i18n'

describe('i18n lazy loader', () => {
  it('loads german catalog on demand', async () => {
    const val = await tAsync('de', 'nav.home')
    // Accept either translated string or raw key if catalog changes wording; ensures dynamic import succeeded
    expect(val).not.toBe('nav.home')
  })

  it('falls back to key when missing', async () => {
    const key = 'missing.unique.key.test'
    const val = await tAsync('de', key)
    expect(val).toBe(key)
  })
})