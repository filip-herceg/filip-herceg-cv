// Deprecated test: legacy static fallback path removed in F16.
// Keeping empty file (instead of delete) because prior attempts to delete
// did not remove it from task runner cache. Contents intentionally minimal.
import { describe, it } from 'vitest'
describe('cv service fallback path (removed)', () => {
  it.skip('static fallback removed; onboarding empty state is now used', () => {})
})
