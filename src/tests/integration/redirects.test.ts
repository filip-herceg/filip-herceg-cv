// Removed legacy /site redirect tests. Keeping file to avoid potential watch mode stale test cache issues.
import { describe, it, expect } from 'vitest'

describe('redirects (removed)', () => {
	it('noop', () => {
		expect(true).toBe(true)
	})
})
