import { hashPassword, verifyPassword } from '../auth'
// Prisma model access casted to any to avoid coupling handler layer to generated types.
import type { AuthContext, HandlerResult } from './types'
import { success, failure } from './types'
import { authRateLimiterBackend, authLoginBackoffMs, authRateLimitFailuresTotal } from '@/lib/metrics'
import { createSession, currentUser, destroySession } from './session'
import { authPrisma } from './prisma-subset'

// Helper to safely detect rate limiter backend without relying on 'any'
function detectBackend(rateLimiter: unknown): 'redis' | 'memory' {
  if (rateLimiter && typeof rateLimiter === 'object' && 'backendType' in rateLimiter) {
    const bt = (rateLimiter as { backendType?: string }).backendType
    if (bt === 'redis') return 'redis'
  }
  try {
    const name = (rateLimiter as { constructor?: { name?: string } })?.constructor?.name || ''
    if (typeof (name as unknown as { includes(sub: string): boolean }).includes === 'function' && name.includes('Redis')) return 'redis'
  } catch {}
  return 'memory'
}

// Login handler (pure, no Next specific API)
export interface LoginInput { username?: string; password?: string }
export async function handleLogin(input: LoginInput, ctx: AuthContext): Promise<HandlerResult<{ result: 'ok' } | { backoffMs: number; error: string }>> {
  await ensureBootstrap(ctx)
  if (!input.username || !input.password) return failure(400, { error: 'MISSING_CREDENTIALS' })
  const p = authPrisma(ctx.prisma)
  const user = await p.adminUser.findUnique({ where: { username: input.username } })
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
  const { failCount, delayMs } = await ctx.rateLimiter.recordFailure(input.username)
  // record backend gauge (gauge.set with label map); prom-client types don't expose narrowed overload with labels generically
  try {
    (authRateLimiterBackend as unknown as { set(labels: { backend: string }, value: number): void }).set({ backend: detectBackend(ctx.rateLimiter) }, 1)
  } catch {}
  try { authLoginBackoffMs.set(delayMs) } catch {}
  try { authRateLimitFailuresTotal.inc() } catch {}
    ctx.metrics.loginAttempts.inc({ result: 'failure' })
    await ctx.clock.sleep(delayMs)
    return failure(401, { error: 'INVALID_CREDENTIALS', backoffMs: delayMs, failCount })
  }
  await ctx.rateLimiter.clear(input.username)
  try {
    (authRateLimiterBackend as unknown as { set(labels: { backend: string }, value: number): void }).set({ backend: detectBackend(ctx.rateLimiter) }, 1)
  } catch {}
  ctx.metrics.loginAttempts.inc({ result: 'success' })
  const { cookie } = await createSession(ctx, user.id)
  // recompute active sessions gauge (best effort)
  const active = await p.session.count({ where: { expiresAt: { gt: new Date() } } })
  ctx.metrics.activeSessions.set(active)
  return success(200, { result: 'ok' as const }, { set: [cookie] })
}

export async function handleLogout(ctx: AuthContext): Promise<HandlerResult<{ result: 'ok' }>> {
  const deleted = await destroySession(ctx)
  const active = await authPrisma(ctx.prisma).session.count({ where: { expiresAt: { gt: new Date() } } })
  ctx.metrics.activeSessions.set(active)
  return success(200, { result: 'ok' as const }, { delete: [deleted] })
}

export async function handleMe(ctx: AuthContext): Promise<HandlerResult<{ id: string; username: string }>> {
  const { user, renewalCookie } = await currentUser(ctx)
  if (!user) return failure(401, { error: 'UNAUTHORIZED' })
  const cookies = renewalCookie ? { set: [renewalCookie] } : undefined
  return success(200, { id: user.id, username: user.username }, cookies)
}

export interface PasswordChangeInput { newPassword?: string; csrfToken?: string }
export async function handlePasswordChange(input: PasswordChangeInput, ctx: AuthContext): Promise<HandlerResult<{ result: 'ok' }>> {
  if (!input.csrfToken) return failure(403, { error: 'CSRF' })
  const csrfCookie = ctx.cookies.get(ctx.config.csrfCookieName)?.value
  if (!csrfCookie || csrfCookie !== input.csrfToken) return failure(403, { error: 'CSRF' })
  const sessionId = ctx.cookies.get(ctx.config.sessionCookieName)?.value
  const { user } = await currentUser(ctx)
  if (!user) return failure(401, { error: 'UNAUTHORIZED' })
  if (!input.newPassword || input.newPassword.length < 12) return failure(400, { error: 'WEAK_PASSWORD' })
  // Update password
  await authPrisma(ctx.prisma).adminUser.update({ where: { id: user.id }, data: { passwordHash: hashPassword(input.newPassword) } })
  // Rotate session (mitigate session fixation after credential change)
  if (sessionId) {
  await authPrisma(ctx.prisma).session.delete({ where: { id: sessionId } }).catch(()=>{})
  }
  const { cookie: newSessionCookie } = await createSession(ctx, user.id)
  return success(200, { result: 'ok' as const }, { set: [newSessionCookie], delete: sessionId ? [{ name: ctx.config.sessionCookieName, options: { path: '/' } }] : undefined })
}

export async function handleIssueCsrf(ctx: AuthContext): Promise<HandlerResult<{ csrfToken: string }>> {
  const token = ctx.clock.randomBytes(24).toString('base64url')
  return success(200, { csrfToken: token }, { set: [{ name: ctx.config.csrfCookieName, value: token, options: csrfCookieOptions(ctx) }] })
}

async function ensureBootstrap(ctx: AuthContext) {
  const { username, password } = ctx.config.bootstrap
  if (!password) return
  const existing = await authPrisma(ctx.prisma).adminUser.findFirst({ where: { username } })
  if (existing) return
  await authPrisma(ctx.prisma).adminUser.create({ data: { username, passwordHash: hashPassword(password) } })
}

function csrfCookieOptions(ctx: AuthContext) {
  return { httpOnly: false, sameSite: 'lax' as const, secure: ctx.config.production, path: '/' }
}
