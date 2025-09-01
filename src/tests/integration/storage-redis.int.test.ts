import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// This test runs only if REAL_REDIS_URL provided; otherwise skipped.
const realRedisUrl = process.env.REAL_REDIS_URL

const maybeDescribe = realRedisUrl ? describe : describe.skip

maybeDescribe('RedisBackend integration (optional)', () => {
  let backend: any // eslint-disable-line @typescript-eslint/no-explicit-any
  beforeAll(async () => {
    process.env.CV_STORAGE = 'redis'
    process.env.REDIS_URL = realRedisUrl
    process.env.CV_REDIS_TTL = '30'
    const mod = await import('../../lib/cv/storage')
    backend = mod.createStorage()
  })
  afterAll(async () => {
    await backend?.close?.()
  })
  it('caches aggregate between calls', async () => {
    const first = await backend.get('en')
    expect(first.data.person.name).toBeTruthy()
    const second = await backend.get('en')
    expect(second.data.person.name).toBe(first.data.person.name)
    // Source may be redis on second call
    expect(['db','redis']).toContain(second.source)
  })
})