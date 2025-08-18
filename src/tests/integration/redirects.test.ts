import { describe, it, expect } from 'vitest'
type Redirect = { source: string; destination: string; permanent?: boolean; basePath?: boolean }
type NextConfigRedirects = { redirects: () => Promise<Redirect[]> }

describe('next redirects', async () => {
	it('includes /site -> / redirect rules', async () => {
		const cfgMod = await import('../../../next.config.mjs')
		const cfg = cfgMod.default as NextConfigRedirects
		const redirects = await cfg.redirects()
		const hasRoot = redirects.some(
			(r) => r.source === '/site' && r.destination === '/' && r.permanent === true,
		)
		const hasWildcard = redirects.some(
			(r) => r.source === '/site/:path*' && r.destination === '/:path*' && r.permanent === true,
		)
		expect(hasRoot && hasWildcard).toBe(true)
	})
})
