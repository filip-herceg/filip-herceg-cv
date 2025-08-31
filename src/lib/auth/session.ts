import type { AuthContext, CookieOptions } from './types'
import { authPrisma } from './prisma-subset'
import { buildSessionCookieOptions } from './cookie-options'

export async function createSession(ctx: AuthContext, userId: string) {
  const expiresAt = new Date(ctx.clock.now() + ctx.config.sessionTtlMs)
  const p = authPrisma(ctx.prisma)
  const session = await p.session.create({ data: { userId, expiresAt } })
  return { session, cookie: { name: ctx.config.sessionCookieName, value: session.id, options: buildSessionCookieOptions(ctx, expiresAt) } }
}

export async function destroySession(ctx: AuthContext) {
  const id = ctx.cookies.get(ctx.config.sessionCookieName)?.value
  if (id) { await authPrisma(ctx.prisma).session.delete({ where: { id } }).catch(() => {}) }
  return { name: ctx.config.sessionCookieName, options: { path: '/' } }
}

export interface CurrentUserResult {
  user: { id: string; username: string } | null
  renewalCookie?: { name: string; value: string; options: CookieOptions }
  expired?: boolean
}

export async function currentUser(ctx: AuthContext): Promise<CurrentUserResult> {
  const id = ctx.cookies.get(ctx.config.sessionCookieName)?.value
  if (!id) return { user: null }
  const p = authPrisma(ctx.prisma)
  const session = await p.session.findUnique({ where: { id }, include: { user: true } })
  if (!session) return { user: null }
  if (session.expiresAt.getTime() < ctx.clock.now()) {
  await p.session.delete({ where: { id } }).catch(() => {})
    return { user: null, expired: true }
  }
  const remaining = session.expiresAt.getTime() - ctx.clock.now()
  const total = ctx.config.sessionTtlMs
  let renewalCookie: { name: string; value: string; options: CookieOptions } | undefined
  if (remaining < total * ctx.config.slidingRenewalFraction) {
    const newExpiry = new Date(ctx.clock.now() + total)
  await p.session.update({ where: { id: session.id }, data: { expiresAt: newExpiry } })
  renewalCookie = { name: ctx.config.sessionCookieName, value: session.id, options: buildSessionCookieOptions(ctx, newExpiry) }
  }
  return { user: { id: session.user.id, username: session.user.username }, renewalCookie }
}

// baseSessionCookieOptions replaced by buildSessionCookieOptions in cookie-options.ts
