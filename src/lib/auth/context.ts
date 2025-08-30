import { authActiveSessions, authLoginAttemptsTotal } from '@/lib/metrics'
import type { AuthContext, CookieStore, RateLimiter } from './types'
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { loadAuthConfig } from './config'
import { MemoryRateLimiter } from './memory-rate-limiter'
import { createRedisRateLimiter, type RedisLike } from './redis-rate-limiter'
import { withFallback } from './fallback-rate-limiter'
// Optional Redis: only require if REDIS_URL set and module available.
// Minimal shape we rely on from ioredis constructor
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type RedisConstructor = new (url: string, opts?: Record<string, unknown>) => RedisLike
let RedisCtor: RedisConstructor | null = null
if (process.env.REDIS_URL) {
  try {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-var-requires
  RedisCtor = (Function('return require'))()('ioredis') as RedisConstructor
  } catch {
    RedisCtor = null
  }
}

let prismaSingleton: PrismaClient | undefined
function prisma() {
  prismaSingleton ??= new PrismaClient()
  return prismaSingleton
}

export interface BuildAuthContextOptions { store: CookieStore; rateLimiter?: RateLimiter }

export function buildAuthContext(opts: BuildAuthContextOptions): AuthContext {
  const { store, rateLimiter } = opts
  const cfg = loadAuthConfig()
  return {
    prisma: prisma(),
    cookies: store,
    metrics: { loginAttempts: authLoginAttemptsTotal, activeSessions: authActiveSessions },
    config: {
      sessionCookieName: cfg.sessionCookieName,
      csrfCookieName: cfg.csrfCookieName,
      sessionTtlMs: cfg.sessionTtlMs,
      slidingRenewalFraction: cfg.slidingRenewalFraction,
      bootstrap: cfg.bootstrap,
      production: cfg.production,
    },
    clock: { now: () => Date.now(), randomBytes: (n: number) => randomBytes(n), sleep: (ms: number) => new Promise(r => setTimeout(r, ms)) },
    rateLimiter: rateLimiter ?? buildRateLimiter(cfg),
  }
}

function buildRateLimiter(cfg: ReturnType<typeof loadAuthConfig>): RateLimiter {
  const baseOpts = { baseMs: cfg.backoff.baseMs, maxMs: cfg.backoff.maxMs, jitterFraction: cfg.backoff.jitterFraction, ttlSeconds: cfg.backoff.ttlSeconds }
  if (process.env.REDIS_URL && RedisCtor) {
    const redis = createRedisRateLimiter(new RedisCtor(process.env.REDIS_URL, { lazyConnect: true }) as unknown as RedisLike, baseOpts)
    const memory = new MemoryRateLimiter(baseOpts)
    return withFallback(redis, memory)
  }
  return new MemoryRateLimiter(baseOpts)
}