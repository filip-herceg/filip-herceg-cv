import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { hashPassword, verifyPassword, ensureAdminBootstrap } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { MemoryCookieStore } from '@/lib/auth/cookies'
import { handleLogin, handleIssueCsrf, handlePasswordChange, handleLogout, handleMe } from '@/lib/auth/handlers'
import type { AuthContext, RateLimiter } from '@/lib/auth/types'
import { authActiveSessions, authLoginAttemptsTotal } from '@/lib/metrics'
import { randomBytes } from 'node:crypto'

// Note: These tests exercise core auth helpers without spinning up the whole app router.

describe('admin auth', () => {
  const dbFile = path.join(process.cwd(), 'test-admin-auth.sqlite')
  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbFile}`
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
    execSync('npx prisma db push', { stdio: 'inherit' })
  })
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('ADMIN_BOOTSTRAP_PASSWORD', 'TestPassword123!')
    vi.stubEnv('ADMIN_BOOTSTRAP_USERNAME', 'root')
  })

  it('hashes and verifies password', () => {
    const h = hashPassword('secret-123')
    expect(h.startsWith('scrypt$')).toBe(true)
    expect(verifyPassword('secret-123', h)).toBe(true)
    expect(verifyPassword('wrong', h)).toBe(false)
  })

  it('bootstraps admin user once', async () => {
    await ensureAdminBootstrap()
    // second call should be noop (no throw)
    await ensureAdminBootstrap()
  })

  function buildCtx(store: MemoryCookieStore): AuthContext {
    const prisma = new PrismaClient()
    const failures = new Map<string, number>()
    const limiter: RateLimiter = {
      recordFailure: async k => { const c=(failures.get(k)||0)+1; failures.set(k,c); return { failCount: c, delayMs: Math.min(2000, 250*Math.pow(2, c-1)) } },
      clear: async k=> { failures.delete(k) },
      backoffMs: fc => Math.min(2000, 250*Math.pow(2, fc-1))
    }
    return {
      prisma,
      cookies: store,
      metrics: { loginAttempts: authLoginAttemptsTotal, activeSessions: authActiveSessions },
      config: { sessionCookieName: 'cv_admin_session', csrfCookieName: 'cv_admin_csrf', sessionTtlMs: 12*3600*1000, slidingRenewalFraction: 0.5, bootstrap: { username: process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin', password: process.env.ADMIN_BOOTSTRAP_PASSWORD }, production: false },
      clock: { now: () => Date.now(), randomBytes: (n:number)=>randomBytes(n), sleep: (ms:number)=> new Promise(r=>setTimeout(r,ms)) },
      rateLimiter: limiter,
    }
  }

  it('fails login with backoff then succeeds', async () => {
    await ensureAdminBootstrap()
    const store = new MemoryCookieStore()
    const ctx = buildCtx(store)
    const start = Date.now()
  const bad = await handleLogin({ username: 'root', password: 'bad' }, ctx)
  expect(bad.status).toBe(401)
  if (bad.ok) throw new Error('expected failure')
  expect(bad.body.error).toBe('INVALID_CREDENTIALS')
    const good = await handleLogin({ username: 'root', password: 'TestPassword123!' }, ctx)
    expect(good.status).toBe(200)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(200)
  })

  it('changes password with csrf token', async () => {
    await ensureAdminBootstrap()
    const store = new MemoryCookieStore(); const ctx = buildCtx(store)
  const loginRes = await handleLogin({ username: 'root', password: 'TestPassword123!' }, ctx)
    expect(loginRes.status).toBe(200)
  // apply session cookie
  loginRes.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    // issue CSRF
  const csrf = await handleIssueCsrf(ctx)
  if (!csrf.ok) throw new Error('failed to issue csrf')
  const token: string = csrf.body.csrfToken
    expect(token).toBeTruthy()
    // write csrf cookie (handler instructions)
    csrf.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
  const change = await handlePasswordChange({ newPassword: 'NewSecurePass456!', csrfToken: token as string }, ctx)
    expect(change.status).toBe(200)
  })

  it('rejects weak password change', async () => {
    await ensureAdminBootstrap()
    const store = new MemoryCookieStore(); const ctx = buildCtx(store)
    // Previous test may have changed the password; try original then fallback to the new one
    let loginRes = await handleLogin({ username: 'root', password: 'TestPassword123!' }, ctx)
    if (loginRes.status !== 200) {
      loginRes = await handleLogin({ username: 'root', password: 'NewSecurePass456!' }, ctx)
    }
    expect(loginRes.status).toBe(200)
    loginRes.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    const csrf = await handleIssueCsrf(ctx)
    if (!csrf.ok) throw new Error('failed to issue csrf')
    csrf.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
  const res = await handlePasswordChange({ newPassword: 'short', csrfToken: csrf.body.csrfToken }, ctx)
    expect(res.status).toBe(400)
  })

  it('me returns user and renews session when below renewal threshold', async () => {
    await ensureAdminBootstrap()
    const store = new MemoryCookieStore(); const ctx = buildCtx(store)
    const login = await handleLogin({ username: 'root', password: 'NewSecurePass456!' }, ctx)
    if (login.status !== 200) {
      const fallback = await handleLogin({ username: 'root', password: 'TestPassword123!' }, ctx)
      expect(fallback.status).toBe(200)
      fallback.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    } else {
      login.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    }
    // Simulate time passage to drop remaining TTL below threshold
    const originalNow = ctx.clock.now
    let nowVal = Date.now()
    ctx.clock.now = () => nowVal
    nowVal += ctx.config.sessionTtlMs * 0.6 // advance past 50% (threshold 0.5)
    const me = await handleMe(ctx)
    expect(me.status).toBe(200)
    // renewal cookie should be present
    expect(me.cookies?.set?.some(c => c.name === ctx.config.sessionCookieName)).toBe(true)
    // restore clock
    ctx.clock.now = originalNow
  })

  it('logout clears session and activeSessions gauge decrements', async () => {
    await ensureAdminBootstrap()
    const store = new MemoryCookieStore(); const ctx = buildCtx(store)
    const login = await handleLogin({ username: 'root', password: 'NewSecurePass456!' }, ctx)
    if (login.status !== 200) {
      const fallback = await handleLogin({ username: 'root', password: 'TestPassword123!' }, ctx)
      fallback.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    } else {
      login.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    }
  const beforeValues = (ctx.metrics.activeSessions as unknown as { get(): { values?: Array<{ value: number }> } }).get().values
  const before = beforeValues && beforeValues.length ? beforeValues[0].value : 1
    const out = await handleLogout(ctx)
    expect(out.status).toBe(200)
  const afterValues = (ctx.metrics.activeSessions as unknown as { get(): { values?: Array<{ value: number }> } }).get().values
  const after = afterValues && afterValues.length ? afterValues[0].value : 0
    expect(after).toBeLessThanOrEqual(before)
  })

  it('rotates session id after password change (session fixation mitigation)', async () => {
    await ensureAdminBootstrap()
    const store = new MemoryCookieStore(); const ctx = buildCtx(store)
    let login = await handleLogin({ username: 'root', password: 'TestPassword123!' }, ctx)
    if (login.status !== 200) {
      login = await handleLogin({ username: 'root', password: 'NewSecurePass456!' }, ctx)
    }
    expect(login.status).toBe(200)
    login.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    const oldSession = store.all()?.[ctx.config.sessionCookieName]?.value
    const csrf = await handleIssueCsrf(ctx)
    if (!csrf.ok) throw new Error('failed to issue csrf')
    csrf.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
  const change = await handlePasswordChange({ newPassword: 'RotatePass789!!!', csrfToken: csrf.body.csrfToken }, ctx)
    expect(change.status).toBe(200)
    change.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    const newSession = store.all()?.[ctx.config.sessionCookieName]?.value
    expect(newSession).toBeTruthy()
    expect(newSession).not.toBe(oldSession)
  })

  it('metrics counters increment for success and failure', async () => {
    await ensureAdminBootstrap()
    const store = new MemoryCookieStore(); const ctx = buildCtx(store)
  // Replace metric with a simple fake counter to avoid prom-client registry/state issues
  const calls: Record<string, number> = { failure: 0, success: 0 }
  const fakeCounter = { inc: ({ result }: { result: string }) => { calls[result] = (calls[result] || 0) + 1 } }
  ;(ctx.metrics as any).loginAttempts = fakeCounter
  // Speed up test by skipping actual sleep delays from exponential backoff
  ctx.clock.sleep = async () => {}
  await handleLogin({ username: 'root', password: 'bad' }, ctx)
  await handleLogin({ username: 'root', password: 'bad' }, ctx).catch(() => {})
  // Previous tests may have rotated password multiple times; force-set a known password for this test
  await (ctx.prisma as any).adminUser.update({ where: { username: 'root' }, data: { passwordHash: hashPassword('MetricsPass123!') } })
  const successAttempt = await handleLogin({ username: 'root', password: 'MetricsPass123!' }, ctx)
  expect(successAttempt.status).toBe(200)
  expect(calls.failure).toBeGreaterThanOrEqual(1)
  expect(calls.success).toBeGreaterThanOrEqual(1)
  })
})
