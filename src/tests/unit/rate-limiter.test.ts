import { describe, it, expect } from 'vitest'
import { MemoryRateLimiter } from '@/lib/auth/memory-rate-limiter'
import { RedisRateLimiter } from '@/lib/auth/redis-rate-limiter'
import { withFallback } from '@/lib/auth/fallback-rate-limiter'

class FakeRedis {
  store = new Map<string, { value: number; expiresAt: number }>()
  now = Date.now
  async incr(key: string) {
    const e = this.store.get(key)
    if (!e || e.expiresAt < this.now()) {
      this.store.set(key, { value: 1, expiresAt: this.now() + 10_000 })
      return 1
    }
    e.value += 1
    return e.value
  }
  async pexpire(key: string, ms: number) {
    const e = this.store.get(key)
    if (e) e.expiresAt = this.now() + ms
  }
  async del(key: string) { this.store.delete(key) }
}

describe('RateLimiter', () => {
  it('memory exponential backoff deterministic without jitter', async () => {
    const rl = new MemoryRateLimiter({ baseMs: 100, maxMs: 800, jitterFraction: 0, ttlSeconds: 60 })
    const delays: number[] = []
    for (let i=0;i<5;i++) {
      const { delayMs } = await rl.recordFailure('u')
      delays.push(delayMs)
    }
    expect(delays).toEqual([100,200,400,800,800])
  })

  it('memory jitter stays within bounds', async () => {
    const rl = new MemoryRateLimiter({ baseMs: 100, maxMs: 400, jitterFraction: 0.25, ttlSeconds: 60 })
    const { delayMs } = await rl.recordFailure('jitter')
    // delay must be within ±25% of 100
    expect(delayMs).toBeGreaterThanOrEqual(75)
    expect(delayMs).toBeLessThanOrEqual(125)
  })

  it('redis limiter shares state across instances', async () => {
    const redis = new FakeRedis()
    const a = new RedisRateLimiter(redis as any, { baseMs: 50, maxMs: 400, jitterFraction: 0, ttlSeconds: 60 })
    const b = new RedisRateLimiter(redis as any, { baseMs: 50, maxMs: 400, jitterFraction: 0, ttlSeconds: 60 })
    const r1 = await a.recordFailure('k')
    const r2 = await b.recordFailure('k')
    const r3 = await a.recordFailure('k')
    expect([r1.failCount, r2.failCount, r3.failCount]).toEqual([1,2,3])
    expect(r3.delayMs).toBeGreaterThanOrEqual(r2.delayMs)
  })

  it('falls back to memory when redis errors', async () => {
  class ThrowRedis extends FakeRedis { async incr(_key: string): Promise<number> { throw new Error('boom'); /* unreachable */ } }
    const redis = new ThrowRedis()
    const primary = new RedisRateLimiter(redis as any, { baseMs: 100, maxMs: 400, jitterFraction: 0, ttlSeconds: 60 })
    const fallback = new MemoryRateLimiter({ baseMs: 100, maxMs: 400, jitterFraction: 0, ttlSeconds: 60 })
    const rl = withFallback(primary, fallback) as any
    const a = await rl.recordFailure('u') // triggers degrade
    const b = await rl.recordFailure('u') // served by memory fallback
    expect(a.failCount).toBe(1)
    expect(b.failCount).toBe(2)
    expect(rl.backendType).toBe('memory')
  })
})