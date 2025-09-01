import { describe, it, expect, vi } from 'vitest'

// Mock prisma to simulate existing user + session
const user = { id: 'u1', username: 'admin', passwordHash: 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' }
vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrisma {
    adminUser = { findUnique: vi.fn(async () => user), findFirst: vi.fn(async () => user), update: vi.fn(async () => user) }
    session = {
      create: vi.fn(async ({ data }: any) => ({ id: 'sess-new', userId: data.userId, expiresAt: data.expiresAt })),
      delete: vi.fn(async () => ({ id: 'sess-old', userId: 'u1', expiresAt: new Date() })),
      findUnique: vi.fn(async () => ({ id: 'sess-old', userId: 'u1', expiresAt: new Date(Date.now() + 1000), user })),
      update: vi.fn(async () => ({ id: 'sess-old', userId: 'u1', expiresAt: new Date(Date.now() + 2000) })),
      count: vi.fn(async () => 1)
    }
  }
}))

vi.mock('@/lib/auth/config', () => ({ loadAuthConfig: () => ({
  sessionCookieName: 'session', csrfCookieName: 'csrf', sessionTtlMs: 1000 * 60 * 60,
  slidingRenewalFraction: 0.5, bootstrap: { username: 'admin', password: 'BootStrapP@ss123' }, production: false,
  backoff: { baseMs: 10, maxMs: 20, jitterFraction: 0, ttlSeconds: 60 }
}) }))

// Metrics stubs (include histogram used indirectly by CV sample-data preload to avoid unhandled errors)
vi.mock('@/lib/metrics', () => ({
  authLoginAttemptsTotal: { inc: vi.fn() },
  authActiveSessions: { inc: vi.fn(), dec: vi.fn(), set: vi.fn() },
  authRateLimiterBackend: { set: vi.fn() },
  authLoginBackoffMs: { set: vi.fn() },
  authRateLimitFailuresTotal: { inc: vi.fn() },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
}))

import { buildAuthContext } from '@/lib/auth/context'
import { handlePasswordChange } from '@/lib/auth/handlers'
import { MemoryCookieStore } from '@/lib/auth/cookies'

describe('handlePasswordChange (F17)', () => {
  it('rejects missing csrf token', async () => {
    const store = new MemoryCookieStore(); store.set('session','sess-old',{ path: '/' })
    const ctx = buildAuthContext({ store })
    const res = await handlePasswordChange({ newPassword: 'NewPassword123!' }, ctx)
    expect(res.status).toBe(403)
  })

  it('rejects weak password', async () => {
    const store = new MemoryCookieStore(); store.set('session','sess-old',{ path: '/' }); store.set('csrf','tok',{ path: '/' })
    const ctx = buildAuthContext({ store })
    const res = await handlePasswordChange({ newPassword: 'short', csrfToken: 'tok' }, ctx)
    expect(res.status).toBe(400)
  })

  it('rotates session on successful change', async () => {
    const store = new MemoryCookieStore(); store.set('session','sess-old',{ path: '/' }); store.set('csrf','tok',{ path: '/' })
    const ctx = buildAuthContext({ store })
    const res = await handlePasswordChange({ newPassword: 'LongerSecurePass123!', csrfToken: 'tok' }, ctx)
    expect(res.status).toBe(200)
    // instruction should include set cookie (new session)
    expect(res.cookies?.set?.[0]?.name).toBe('session')
  })
})
