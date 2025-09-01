import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal context & prisma mock
function makeCtx(overrides: Partial<any> = {}) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const cookiesMap = new Map<string,{ value: string; options?: any }>() // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    prisma: {
      session: {
        create: vi.fn(async ({ data: { userId, expiresAt } }: any) => ({ id: 's1', userId, expiresAt })), // eslint-disable-line @typescript-eslint/no-explicit-any
        delete: vi.fn(async () => {}),
        findUnique: vi.fn(async ({ where: { id } }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (id !== 's1') return null
          return { id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 1000), user: { id: 'u1', username: 'admin' } }
        }),
        update: vi.fn(async ({ where: { id }, data: { expiresAt } }: any) => ({ id, userId: 'u1', expiresAt })), // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    },
    config: { sessionCookieName: 'sid', csrfCookieName: 'csrf', sessionTtlMs: 1000, slidingRenewalFraction: 0.5, production: false },
    clock: { now: () => Date.now(), sleep: (ms: number) => new Promise(r => setTimeout(r, ms)) },
    cookies: {
      get: (n: string) => cookiesMap.get(n),
      set: (n: string, v: string, options?: any) => { cookiesMap.set(n, { value: v, options }) }, // eslint-disable-line @typescript-eslint/no-explicit-any
      delete: (n: string) => { cookiesMap.delete(n) }
    },
    ...overrides
  }
}

vi.mock('@/lib/auth/prisma-subset', () => ({ authPrisma: (p: any) => p })) // eslint-disable-line @typescript-eslint/no-explicit-any
vi.mock('@/lib/auth/cookie-options', () => ({ buildSessionCookieOptions: (_ctx: any, expires: Date) => ({ path: '/', httpOnly: true, sameSite: 'lax', secure: false, expires }) })) // eslint-disable-line @typescript-eslint/no-explicit-any

describe('auth session primitives', () => {
  beforeEach(() => { /* reset handled per-test by new ctx */ })

  it('creates a session and returns cookie descriptor', async () => {
    const ctx = makeCtx()
    const { createSession } = await import('@/lib/auth/session')
    const res = await createSession(ctx as any, 'u1') // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.session.id).toBe('s1')
    expect(res.cookie.name).toBe('sid')
    expect(res.cookie.options.httpOnly).toBe(true)
  })

  it('returns null user when no cookie set', async () => {
    const ctx = makeCtx()
    const { currentUser } = await import('@/lib/auth/session')
    const r = await currentUser(ctx as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.user).toBeNull()
  })

  it('returns expired flag and deletes session when expired', async () => {
    const now = Date.now()
    const ctx = makeCtx({
      clock: { now: () => now + 10_000, sleep: (ms: number) => new Promise(r => setTimeout(r, ms)) },
      prisma: {
        session: {
          create: vi.fn(async ({ data: { userId, expiresAt } }: any) => ({ id: 's1', userId, expiresAt })), // eslint-disable-line @typescript-eslint/no-explicit-any
          delete: vi.fn(async () => {}),
          findUnique: vi.fn(async () => ({ id: 's1', userId: 'u1', expiresAt: new Date(now - 1000), user: { id: 'u1', username: 'admin' } })),
          update: vi.fn()
        }
      }
    })
    ctx.cookies.set('sid', 's1')
    const { currentUser } = await import('@/lib/auth/session')
    const r = await currentUser(ctx as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.user).toBeNull()
    expect(r.expired).toBe(true)
  })

  it('renews session when below sliding fraction', async () => {
    const now = Date.now()
    const ttl = 10_000
    const ctx = makeCtx({
      config: { sessionCookieName: 'sid', csrfCookieName: 'csrf', sessionTtlMs: ttl, slidingRenewalFraction: 0.5, production: false },
      clock: { now: () => now, sleep: (ms: number) => new Promise(r => setTimeout(r, ms)) },
      prisma: {
        session: {
          create: vi.fn(async ({ data: { userId, expiresAt } }: any) => ({ id: 's1', userId, expiresAt })), // eslint-disable-line @typescript-eslint/no-explicit-any
          delete: vi.fn(async () => {}),
          findUnique: vi.fn(async () => ({ id: 's1', userId: 'u1', expiresAt: new Date(now + (ttl * 0.4)), user: { id: 'u1', username: 'admin' } })),
          update: vi.fn(async ({ data: { expiresAt } }: any) => ({ id: 's1', userId: 'u1', expiresAt })) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
      }
    })
    ctx.cookies.set('sid', 's1')
    const { currentUser } = await import('@/lib/auth/session')
    const r = await currentUser(ctx as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.user?.id).toBe('u1')
    expect(r.renewalCookie).toBeTruthy()
  })
})
