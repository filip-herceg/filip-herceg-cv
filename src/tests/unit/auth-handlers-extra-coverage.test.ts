import { describe, it, expect, vi } from 'vitest'

// Metrics mock including histogram & auth metrics used by buildAuthContext
const rateBackendSet = vi.fn()
vi.mock('@/lib/metrics', () => ({
  authLoginAttemptsTotal: { inc: vi.fn() },
  authActiveSessions: { set: vi.fn(), inc: vi.fn(), dec: vi.fn() },
  authRateLimiterBackend: { set: (...a:any[]) => rateBackendSet(...a) }, // eslint-disable-line @typescript-eslint/no-explicit-any
  authLoginBackoffMs: { set: vi.fn() },
  authRateLimitFailuresTotal: { inc: vi.fn() },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
}))

// Prisma mock for two scenarios (login failure path + password change rotation with delete error)
// We'll switch behaviour via a flag.
let mode: 'empty' | 'password-change' = 'empty'
const user = { id: 'u1', username: 'admin', passwordHash: 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' }
vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrisma {
    adminUser = {
      findUnique: vi.fn(async ({ where: { username } }: any) => mode === 'password-change' && username === user.username ? user : null), // eslint-disable-line @typescript-eslint/no-explicit-any
      findFirst: vi.fn(async ({ where: { username } }: any) => mode === 'password-change' && username === user.username ? user : null),
      create: vi.fn(async () => user),
      update: vi.fn(async () => user),
    }
    session = {
      create: vi.fn(async ({ data }: any) => ({ id: 'sess-new', userId: data.userId, expiresAt: data.expiresAt })), // eslint-disable-line @typescript-eslint/no-explicit-any
      delete: vi.fn(async () => { if (mode === 'password-change') throw new Error('boom'); }),
      findUnique: vi.fn(async ({ where: { id } }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (mode !== 'password-change' || id !== 'sess-old') return null
        return { id: 'sess-old', userId: 'u1', expiresAt: new Date(Date.now() + 10_000), user }
      }),
      update: vi.fn(async ({ where: { id }, data: { expiresAt } }: any) => ({ id, userId: 'u1', expiresAt })),
      count: vi.fn(async () => 1),
    }
  }
}))

// Provide explicit auth config mock (reuse simple cookie names used in other tests to avoid cross-file module cache surprises)
vi.mock('@/lib/auth/config', () => ({ loadAuthConfig: () => ({
  sessionCookieName: 'session', csrfCookieName: 'csrf', sessionTtlMs: 1000 * 60 * 60,
  slidingRenewalFraction: 0.5, bootstrap: { username: 'admin', password: 'BootStrapP@ss123' }, production: false,
  backoff: { baseMs: 10, maxMs: 20, jitterFraction: 0, ttlSeconds: 60 }
}) }))

import { buildAuthContext } from '@/lib/auth/context'
import { handleLogin, handlePasswordChange } from '@/lib/auth/handlers'
import { MemoryCookieStore } from '@/lib/auth/cookies'

// Custom rate limiter class WITHOUT backendType but with constructor name containing "Redis" to hit detectBackend second branch
class FancyRedisLimiter { // constructor name includes Redis
  private fails = 0
  async recordFailure() { this.fails++; return { failCount: this.fails, delayMs: 1 } }
  async clear() { this.fails = 0 }
}

describe('auth handlers extra coverage (F17)', () => {
  it('detects redis backend via constructor name path on failure', async () => {
    mode = 'empty'
    const ctx = buildAuthContext({ store: new MemoryCookieStore(), rateLimiter: new FancyRedisLimiter() as any }) // eslint-disable-line @typescript-eslint/no-explicit-any
    const res = await handleLogin({ username: 'admin', password: 'wrong' }, ctx)
    expect(res.status).toBe(401)
    expect(rateBackendSet).toHaveBeenCalled() // gauge set invoked with redis backend detection
  })

  it('swallows session.delete error during password change rotation catch path', async () => {
    mode = 'password-change'
    const store = new MemoryCookieStore()
  // Use mocked config cookie names (session / csrf)
  store.set('session', 'sess-old', { path: '/' })
  store.set('csrf', 'tok', { path: '/' })
    const ctx = buildAuthContext({ store })
    const res = await handlePasswordChange({ newPassword: 'StrongPassword123!', csrfToken: 'tok' }, ctx)
    expect(res.status).toBe(200)
  // original session delete attempted despite rejection (error swallowed)
  const prisma = (ctx.prisma as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(prisma.session.delete).toHaveBeenCalled()
  })
})
