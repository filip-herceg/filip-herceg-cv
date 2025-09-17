import type { PrismaClient } from '@prisma/client'
import { getPrisma } from '@/lib/cv/service'
import { authPrisma } from './auth/prisma-subset'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

let prisma: PrismaClient | undefined
function db(): PrismaClient {
  // Reuse injected prisma in tests if present; otherwise lazily instantiate
  prisma ??= getPrisma()
  return prisma
}

// Test-only hook: allows unit tests to inject a mock Prisma-like object without
// instantiating a real client (which would require DATABASE_URL). Not exported
// in README/docs – intentionally prefixed to discourage prod usage.
// Accept unknown and cast locally to keep public surface free of `any`.
export function __setPrismaForTests(p: unknown) { prisma = p as PrismaClient }

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

// NOTE: Legacy session helpers moved to framework-agnostic handlers (src/lib/auth/*)
// This file intentionally retains only cryptographic primitives & bootstrap listUsers/changePassword
// to avoid breaking existing imports while refactor routes rely on new handlers.

// Bootstrap helper: if no admin user exists and ADMIN_BOOTSTRAP_PASSWORD provided, create one.
export async function ensureAdminBootstrap() {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin'
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
  if (!password) return
  const p = authPrisma(db())
  const existing = await p.adminUser.findFirst({ where: { username } })
  if (existing) return
  await p.adminUser.create({ data: { username, passwordHash: hashPassword(password) } })
}

export async function listUsers() {
  interface MinimalUser { id: string; username: string; createdAt: Date }
  type FindManyArgs = { select: { id: true; username: true; createdAt: true } }
  const p = authPrisma(db()) as unknown as { adminUser: { findMany(args: FindManyArgs): Promise<MinimalUser[]> } }
  return p.adminUser.findMany({ select: { id: true, username: true, createdAt: true } })
}

export async function changePassword(userId: string, newPassword: string) {
  return authPrisma(db()).adminUser.update({ where: { id: userId }, data: { passwordHash: hashPassword(newPassword) } })
}
