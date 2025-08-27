import { describe, it, expect } from 'vitest'
import sitemap from '@/../app/sitemap'

describe('app sitemap route', () => {
  it('produces entries with alternates', () => {
    const entries = sitemap()
    // expect at least root + about
    const root = entries.find(e => e.url.endsWith('localhost:3000'))
    expect(root).toBeTruthy()
    expect(root?.alternates?.languages?.['x-default']).toBeDefined()
  })
})
