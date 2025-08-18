import { describe, it, expect } from 'vitest'

describe('next redirects', async () => {
  it('includes /site -> / redirect rules', async () => {
    const cfgMod: any = await import('../../next.config.mjs')
    const cfg = cfgMod.default
    const redirects = await cfg.redirects()
    const hasRoot = redirects.some(
      (r: any) => r.source === '/site' && r.destination === '/' && r.permanent === true,
    )
    const hasWildcard = redirects.some(
      (r: any) =>
        r.source === '/site/:path*' && r.destination === '/:path*' && r.permanent === true,
    )
    expect(hasRoot && hasWildcard).toBe(true)
  })
})
