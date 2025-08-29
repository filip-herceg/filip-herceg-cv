import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createSession, ensureAdminBootstrap, verifyPassword } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  await ensureAdminBootstrap()
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const { username, password } = body || {}
  if (!username || !password) return NextResponse.json({ error: 'MISSING_CREDENTIALS' }, { status: 400 })
  const user = await prisma.adminUser.findUnique({ where: { username } })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
  }
  await createSession(user.id)
  return NextResponse.json({ result: 'ok' })
}
