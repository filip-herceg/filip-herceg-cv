import type { RateLimiter, RateLimiterRecordResult } from './types'
import { logger, logError, logEvent } from '@/lib/logger'

/**
 * Wraps a primary (redis) limiter with a memory fallback. If the primary throws once,
 * we mark the wrapper degraded and route all subsequent calls to the fallback.
 * (Simple circuit – no automatic recovery; can be extended later.)
 */
export class FallbackRateLimiter implements RateLimiter {
  private degraded = false
  private readonly primary: RateLimiter
  private readonly fallback: RateLimiter
  private warned = false
  public get backendType() { return this.degraded ? (this.fallback as unknown as { backendType?: string }).backendType || 'memory' : (this.primary as unknown as { backendType?: string }).backendType || 'redis' }
  constructor(primary: RateLimiter, fallback: RateLimiter) {
    this.primary = primary
    this.fallback = fallback
  }
  backoffMs(failCount: number): number {
    // Delegate to whichever backend is active for consistent reporting
  const impl = this.degraded ? (this.fallback as unknown as { backoffMs?(n:number):number }) : (this.primary as unknown as { backoffMs?(n:number):number })
    return typeof impl.backoffMs === 'function' ? impl.backoffMs(failCount) : 0
  }
  private degrade(err: unknown) {
    if (!this.degraded) {
      this.degraded = true
      logError(logger, 'auth.rate_limiter.redis_error', err, { degraded: true })
      if (!this.warned) { this.warned = true; logEvent(logger, 'auth.rate_limiter.fallback_activated', { backend: 'memory' }) }
    }
  }
  async recordFailure(id: string): Promise<RateLimiterRecordResult> {
    if (this.degraded) return this.fallback.recordFailure(id)
    try {
      return await this.primary.recordFailure(id)
    } catch (e) {
      this.degrade(e)
      return this.fallback.recordFailure(id)
    }
  }
  async clear(id: string): Promise<void> {
    if (this.degraded) return this.fallback.clear(id)
    try { await this.primary.clear(id) } catch (e) { this.degrade(e); await this.fallback.clear(id) }
  }
}

export function withFallback(primary: RateLimiter, fallback: RateLimiter): RateLimiter {
  return new FallbackRateLimiter(primary, fallback)
}
