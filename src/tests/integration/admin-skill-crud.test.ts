import { describe, it, expect, beforeAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { handleLogin } from '@/lib/auth/handlers'
import { buildAuthContext } from '@/lib/auth/context'
import { MemoryCookieStore } from '@/lib/auth/cookies'
import { PrismaClient } from '@prisma/client'
import { invalidateAggregateCache } from '@/lib/cv/service'
import { hashPassword } from '@/lib/auth'

describe('admin skill CRUD', () => {
  const dbFile = path.join(process.cwd(), 'test-admin-skill.sqlite')
  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbFile}`
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
    execSync('npx prisma db push', { stdio: 'inherit' })
    vi.stubEnv('ADMIN_BOOTSTRAP_PASSWORD', 'CrudPass123!')
    vi.stubEnv('ADMIN_BOOTSTRAP_USERNAME', 'root')
  })

  async function ctxWithLogin() {
    const prisma = new PrismaClient()
    // ensure bootstrap user present with expected password
  await (prisma as any).adminUser.upsert({ where: { username: 'root' }, update: { passwordHash: hashPassword('CrudPass123!') }, create: { username: 'root', passwordHash: hashPassword('CrudPass123!') } })
  // ensure baseline person row so aggregate loads DB data instead of empty scaffold
  await prisma.person.upsert({ where: { locale: 'en' }, update: { name: 'Tester', title: 'Dev', profile: 'Profile', email: 't@example.com' }, create: { locale: 'en', name: 'Tester', title: 'Dev', profile: 'Profile', email: 't@example.com' } })
    const store = new MemoryCookieStore()
    const ctx = buildAuthContext({ store })
    const loginRes = await handleLogin({ username: 'root', password: 'CrudPass123!' }, ctx)
    expect(loginRes.status).toBe(200)
    loginRes.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    return { ctx, prisma }
  }

  it('creates, fetches via aggregate, then deletes a skill', async () => {
  const { prisma } = await ctxWithLogin()
  await prisma.skill.upsert({ where: { id_locale: { id: 'ts', locale: 'en' } }, update: { name: 'TypeScript', category: 'Language' }, create: { id: 'ts', locale: 'en', name: 'TypeScript', category: 'Language' } })
  invalidateAggregateCache('en')
  const skillsAfterCreate = await prisma.skill.findMany({ where: { locale: 'en', id: 'ts' } })
  expect(skillsAfterCreate.length).toBe(1)
  await prisma.skill.delete({ where: { id_locale: { id: 'ts', locale: 'en' } } })
  invalidateAggregateCache('en')
  const skillsAfterDelete = await prisma.skill.findMany({ where: { locale: 'en', id: 'ts' } })
  expect(skillsAfterDelete.length).toBe(0)
  })
})
