import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

let prisma: PrismaClient | undefined
function db() { return prisma ??= new PrismaClient() }

// Password hashing (scrypt). Format: scrypt$N$r$p$salt$hash
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const N = 16384, r = 8, p = 1 // scrypt params
  const key = scryptSync(password, salt, 64, { N, r, p })
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$')
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, rStr, pStr, saltB64, keyB64] = stored.split('$')
    if (scheme !== 'scrypt') return false
    const N = parseInt(nStr,10), r = parseInt(rStr,10), p = parseInt(pStr,10)
    const salt = Buffer.from(saltB64, 'base64')
    const key = Buffer.from(keyB64, 'base64')
    const derived = scryptSync(password, salt, key.length, { N, r, p })
    return timingSafeEqual(key, derived)
  } catch { return false }
}

// Session cookie name
const SESSION_COOKIE = 'cv_admin_session'
const SESSION_TTL_HOURS = 12

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS*3600*1000)
  const session = await db().session.create({ data: { userId, expiresAt } })
  const c = await cookies()
  c.set(SESSION_COOKIE, session.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt })
  return session
}

export async function destroySession() {
  const c = await cookies(); const id = c.get(SESSION_COOKIE)?.value
  if (id) { await db().session.delete({ where: { id } }).catch(()=>{}) }
  c.delete(SESSION_COOKIE)
}

export async function currentUser() {
  const c = await cookies(); const id = c.get(SESSION_COOKIE)?.value
  if (!id) return null
  const session = await db().session.findUnique({ where: { id }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) { await destroySession(); return null }
  return session.user
}

export async function requireAuth(): Promise<{ id: string; username: string }> {
  const u = await currentUser()
  if (!u) throw new Error('UNAUTHORIZED')
  return { id: u.id, username: u.username }
}

// Bootstrap helper: if no admin user exists and ADMIN_BOOTSTRAP_PASSWORD provided, create one.
export async function ensureAdminBootstrap() {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin'
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
  if (!password) return
  const existing = await db().adminUser.findFirst({ where: { username } })
  if (existing) return
  await db().adminUser.create({ data: { username, passwordHash: hashPassword(password) } })
}

export async function listUsers() {
  return db().adminUser.findMany({ select: { id: true, username: true, createdAt: true } })
}

export async function changePassword(userId: string, newPassword: string) {
  return db().adminUser.update({ where: { id: userId }, data: { passwordHash: hashPassword(newPassword) } })
}
