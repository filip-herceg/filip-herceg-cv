import type { RateLimiter, RateLimiterRecordResult } from './types'

export interface MemoryRateLimiterOptions {
  baseMs: number
  maxMs: number
  jitterFraction: number
}

export class MemoryRateLimiter implements RateLimiter {
  public readonly backendType = 'memory'
  private readonly fails = new Map<string, { count: number; expiresAt: number }>()
  private readonly ttlMs: number
  private readonly base: number
  private readonly max: number
  private readonly jitterFraction: number
  constructor(opts?: Partial<MemoryRateLimiterOptions> & { ttlSeconds?: number }) {
    this.base = opts?.baseMs ?? Number(process.env.AUTH_BACKOFF_BASE_MS || 250)
    this.max = opts?.maxMs ?? Number(process.env.AUTH_BACKOFF_MAX_MS || 2000)
    this.ttlMs = (opts?.ttlSeconds ?? Number(process.env.AUTH_RATE_LIMIT_TTL_SECONDS || 600)) * 1000
    this.jitterFraction = opts?.jitterFraction ?? Number(process.env.AUTH_BACKOFF_JITTER_FRACTION || 0)
  }
  private purgeExpired(now: number) {
    for (const [k, v] of this.fails) { if (v.expiresAt <= now) this.fails.delete(k) }
  }
  backoffMs(failCount: number): number {
    return Math.min(this.max, this.base * Math.pow(2, failCount - 1))
  }
  private applyJitter(delay: number): number {
    if (!this.jitterFraction) return delay
    const jitter = (Math.random() * 2 - 1) * this.jitterFraction // -f .. +f
    return Math.max(0, Math.round(delay * (1 + jitter)))
  }
  async recordFailure(key: string): Promise<RateLimiterRecordResult> {
    const now = Date.now()
    this.purgeExpired(now)
    const entry = this.fails.get(key)
    const count = entry ? entry.count + 1 : 1
    this.fails.set(key, { count, expiresAt: now + this.ttlMs })
    const baseDelay = this.backoffMs(count)
    const delayMs = this.applyJitter(baseDelay)
    return { failCount: count, delayMs }
  }
  async clear(key: string): Promise<void> { this.fails.delete(key) }
}

export function createMemoryRateLimiter(): RateLimiter { return new MemoryRateLimiter() }
