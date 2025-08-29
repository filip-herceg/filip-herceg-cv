import type { RateLimiter, RateLimiterRecordResult } from './types'
// Avoid hard dependency on 'ioredis' types to keep optional; consumer provides a compatible instance.
export interface RedisLike { incr(key: string): Promise<number>; pexpire(key: string, ms: number): Promise<unknown>; del(key: string): Promise<unknown> }

export interface RedisRateLimiterOptions {
	baseMs: number
	maxMs: number
	jitterFraction: number
	ttlSeconds: number
	namespace?: string
}

/**
 * Redis-backed RateLimiter.
 * Strategy: sliding window keyed by identity; each failure INCR + PEXPIRE (ttl reset).
 * Exponential backoff identical to MemoryRateLimiter to keep behavior consistent.
 * (Fallback + structured logging handled in later refactor step 8.)
 */
export class RedisRateLimiter implements RateLimiter {
	public readonly backendType = 'redis'
	private readonly redis: RedisLike
	private readonly base: number
	private readonly max: number
	private readonly jitterFraction: number
	private readonly ttlMs: number
	private readonly ns: string
		constructor(redis: RedisLike, opts: RedisRateLimiterOptions) {
		this.redis = redis
		this.base = opts.baseMs
		this.max = opts.maxMs
		this.jitterFraction = opts.jitterFraction
		this.ttlMs = opts.ttlSeconds * 1000
		this.ns = opts.namespace || 'auth:rl'
	}
	private key(id: string) { return `${this.ns}:${id}` }
	backoffMs(failCount: number): number { return Math.min(this.max, this.base * Math.pow(2, failCount - 1)) }
	private applyJitter(delay: number): number {
		if (!this.jitterFraction) return delay
		const jitter = (Math.random() * 2 - 1) * this.jitterFraction // -f .. +f fraction
		return Math.max(0, Math.round(delay * (1 + jitter)))
	}
	async recordFailure(id: string): Promise<RateLimiterRecordResult> {
		const k = this.key(id)
		// INCR then set / refresh TTL (sliding). Race-safety: repeated PEXPIRE acceptable.
		const count = await this.redis.incr(k)
		// Use pexpire for ms precision; ignore result (non-critical).
		await this.redis.pexpire(k, this.ttlMs)
		const baseDelay = this.backoffMs(count)
		const delayMs = this.applyJitter(baseDelay)
		return { failCount: count, delayMs }
	}
	async clear(id: string): Promise<void> { await this.redis.del(this.key(id)) }
}

export function createRedisRateLimiter(redis: RedisLike, opts: Omit<RedisRateLimiterOptions, 'namespace'> & { namespace?: string }): RateLimiter {
	return new RedisRateLimiter(redis, opts)
}
