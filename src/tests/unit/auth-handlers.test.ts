import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal metrics stub
vi.mock('@/lib/metrics', () => ({
  authRateLimiterBackend: { set: () => {} },
  authLoginBackoffMs: { set: () => {} },
  authRateLimitFailuresTotal: { inc: () => {} },
  // cv storage histogram used indirectly by sample-data import
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
}))

// Fake prisma subset used by handlers via authPrisma wrapper
interface User { id: string; username: string; passwordHash: string }
interface Session { id: string; userId: string; expiresAt: Date }
let users: User[] = []
let sessions: Session[] = []

// Auth primitives
vi.mock('@/lib/auth', () => ({
  hashPassword: (p: string) => `h:${p}`,
  verifyPassword: (p: string, hash: string) => hash === `h:${p}`
}))

// Session helpers
vi.mock('@/lib/auth/session', () => ({
  createSession: async (_ctx: any, userId: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const id = `s${sessions.length+1}`
    const expiresAt = new Date(Date.now()+60_000)
    sessions.push({ id, userId, expiresAt })
    return { cookie: { name: 'sid', value: id, options: { path: '/' } } }
  },
  destroySession: async (_ctx: any) => ({ name: 'sid', options: { path: '/' } }),
  currentUser: async (ctx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const sid = ctx.cookies.get(ctx.config.sessionCookieName)?.value
    const sess = sessions.find(s => s.id === sid && s.expiresAt > new Date())
    if (!sess) return { user: null }
    const user = users.find(u => u.id === sess.userId) || null
    return { user }
  }
}))

// prisma-subset wrapper returns provided prisma directly
vi.mock('@/lib/auth/prisma-subset', () => ({ authPrisma: (p: any) => p })) // eslint-disable-line @typescript-eslint/no-explicit-any

// Rate limiter mock
function makeRateLimiter() {
  let failures = 0
  return {
    backendType: 'memory',
    async recordFailure() { failures++; return { failCount: failures, delayMs: Math.min(50*failures, 200) } },
    async clear() { failures = 0 },
  }
}

// cookie jar util
function cookieJar() {
  const map = new Map<string,{ value: string; options?: any }>() // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    get: (name: string) => map.get(name),
    set: (name: string, value: string, options?: any) => { map.set(name, { value, options }) }, // eslint-disable-line @typescript-eslint/no-explicit-any
    delete: (name: string) => { map.delete(name) }
  }
}

// Build auth context skeleton matching handlers expectations
function buildCtx() {
  return {
    prisma: {
      adminUser: {
        findUnique: async ({ where: { username } }: any) => users.find(u => u.username === username) || null,
        findFirst: async ({ where: { username } }: any) => users.find(u => u.username === username) || null,
        create: async ({ data }: any) => { const user = { id: `u${users.length+1}` , ...data }; users.push(user as User); return user },
        update: async ({ where: { id }, data }: any) => {
          const u = users.find(x => x.id === id)
            if (u) {
            Object.assign(u, data)
          }
          return u
        }
      },
      session: {
        create: async ({ data: { userId, expiresAt } }: any) => { const id = `s${sessions.length+1}`; const s = { id, userId, expiresAt }; sessions.push(s); return s },
        findUnique: async ({ where: { id } }: any) => {
          const s = sessions.find(x => x.id === id)
          if (!s) return null
          return { ...s, user: users.find(u => u.id === s.userId)! }
        },
  update: async ({ where: { id }, data: { expiresAt } }: any) => { const s = sessions.find(x => x.id === id); if (s) { s.expiresAt = expiresAt } return s },
        count: async ({ where: { expiresAt } }: any) => sessions.filter(s => s.expiresAt > expiresAt.gt).length,
        delete: async ({ where: { id } }: any) => { sessions = sessions.filter(s => s.id !== id) }
      }
    },
    rateLimiter: makeRateLimiter(),
  config: { sessionCookieName: 'sid', csrfCookieName: 'csrf', sessionTtlMs: 60_000, slidingRenewalFraction: 0.5, bootstrap: { username: 'admin', password: 'bootstrap-pass' }, production: false },
    metrics: { loginAttempts: { inc: () => {} }, activeSessions: { set: () => {} } },
  // Rename unused param to _ms to satisfy eslint no-unused-vars
  clock: { sleep: (_ms: number) => new Promise(r => setTimeout(r, 0)), randomBytes: (n: number) => Buffer.alloc(n, 1) },
    cookies: cookieJar(),
  }
}

describe('auth handlers', () => {
  beforeEach(() => { users = []; sessions = [] })
  it('bootstraps admin and fails login with backoff then succeeds', async () => {
    const ctx = buildCtx()
    const { handleLogin } = await import('@/lib/auth/handlers')
    // failure
    const r1 = await handleLogin({ username: 'admin', password: 'wrong' }, ctx as any)
    expect(r1.ok).toBe(false)
    expect((r1.body as any).backoffMs).toBeGreaterThan(0)
    // success (bootstrap created user lazily)
    const r2 = await handleLogin({ username: 'admin', password: 'bootstrap-pass' }, ctx as any)
    expect(r2.ok).toBe(true)
  })

  it('rejects weak password change and then accepts strong one', async () => {
    const ctx = buildCtx()
    const { handleLogin, handlePasswordChange } = await import('@/lib/auth/handlers')
  const login = await handleLogin({ username: 'admin', password: 'bootstrap-pass' }, ctx as any)
  // Apply set-cookie instructions to jar
  login.cookies?.set?.forEach(c => ctx.cookies.set(c.name, c.value, c.options))
    // set cookies to simulate logged in
    ctx.cookies.set('csrf', 't')
    const weak = await handlePasswordChange({ newPassword: 'short', csrfToken: 't' }, ctx as any)
    expect(weak.ok).toBe(false)
    const strong = await handlePasswordChange({ newPassword: 'averyverystrongpw', csrfToken: 't' }, ctx as any)
    if (!strong.ok) {
      // debug aid: expose body for failure diagnosis
      // eslint-disable-next-line no-console
      console.log('password change strong result', strong)
    }
    expect(strong.ok).toBe(true)
  })
})
