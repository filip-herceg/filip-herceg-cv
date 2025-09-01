import { describe, it, expect, vi } from 'vitest'

// Mock prisma subset used by handlers via authPrisma
vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrisma {
    adminUser = { findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null), create: vi.fn(), update: vi.fn() }
    session = { count: vi.fn(async () => 0), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), update: vi.fn() }
  }
}))

// Provide deterministic config
vi.mock('@/lib/auth/config', () => ({ loadAuthConfig: () => ({
  sessionCookieName: 'session', csrfCookieName: 'csrf', sessionTtlMs: 1000 * 60 * 60,
  slidingRenewalFraction: 0.5, bootstrap: { username: 'admin', password: 'BootStrapP@ss123' }, production: false,
  backoff: { baseMs: 10, maxMs: 20, jitterFraction: 0, ttlSeconds: 60 }
}) }))

// Metrics stubs (add histogram to satisfy storage preload which uses cvStorageGetDurationSeconds)
const incLogin = vi.fn(); const setActive = vi.fn();
vi.mock('@/lib/metrics', () => ({
  authLoginAttemptsTotal: { inc: (...a:any[]) => incLogin(...a) },
  authActiveSessions: { inc: vi.fn(), dec: vi.fn(), set: (...a:any[]) => setActive(...a) },
  authRateLimiterBackend: { set: vi.fn() },
  authLoginBackoffMs: { set: vi.fn() },
  authRateLimitFailuresTotal: { inc: vi.fn() },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
}))

import { buildAuthContext } from '@/lib/auth/context'
import { handleLogin } from '@/lib/auth/handlers'
import { MemoryCookieStore } from '@/lib/auth/cookies'

// Custom simple rate limiter to observe delay usage
class FakeLimiter {
  private fails = 0
  async recordFailure() { this.fails++; return { failCount: this.fails, delayMs: 1 } }
  async clear() { this.fails = 0 }
  backendType = 'memory'
}

describe('handleLogin failure path (F17)', () => {
  it('returns INVALID_CREDENTIALS with backoff + metrics', async () => {
    const ctx = buildAuthContext({ store: new MemoryCookieStore(), rateLimiter: new FakeLimiter() as any })
    const startFails = (ctx.rateLimiter as any).fails || 0
    const res = await handleLogin({ username: 'admin', password: 'wrong' }, ctx)
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('backoffMs')
    expect(incLogin).toHaveBeenCalledWith({ result: 'failure' })
    expect((ctx.rateLimiter as any).fails).toBe(startFails + 1)
  })
})
