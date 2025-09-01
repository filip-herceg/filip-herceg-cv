// Archived: replaced by cv-storage-redis-disabled.test.ts
// Original file triggered a persistent stale ESLint unused var diagnostic.
// Keeping for historical reference but excluded from lint via .eslintignore.
import { describe, it, expect, vi } from 'vitest'
process.env.CV_STORAGE = 'redis'
vi.mock('ioredis', () => { throw new Error('ioredis load failure') })
describe('cv storage error branches (archived)', () => {
  it('fallback still functions (archived)', async () => {
    const { getCvData } = await import('@/lib/cv/loader')
    const data = await getCvData('en')
    expect(data.person.name).toBeTruthy()
  })
})
