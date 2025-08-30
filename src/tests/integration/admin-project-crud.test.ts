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

describe('admin project CRUD', () => {
  const dbFile = path.join(process.cwd(), 'test-admin-project.sqlite')
  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbFile}`
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
    execSync('npx prisma db push', { stdio: 'inherit' })
    vi.stubEnv('ADMIN_BOOTSTRAP_PASSWORD', 'CrudPass123!')
    vi.stubEnv('ADMIN_BOOTSTRAP_USERNAME', 'root')
  })

  async function ctxWithLogin() {
    const prisma = new PrismaClient()
    await (prisma as any).adminUser.upsert({ where: { username: 'root' }, update: { passwordHash: hashPassword('CrudPass123!') }, create: { username: 'root', passwordHash: hashPassword('CrudPass123!') } })
    await prisma.person.upsert({ where: { locale: 'en' }, update: { name: 'Tester', title: 'Dev', profile: 'Profile', email: 't@example.com' }, create: { locale: 'en', name: 'Tester', title: 'Dev', profile: 'Profile', email: 't@example.com' } })
    const store = new MemoryCookieStore()
    const ctx = buildAuthContext({ store })
    const loginRes = await handleLogin({ username: 'root', password: 'CrudPass123!' }, ctx)
    expect(loginRes.status).toBe(200)
    loginRes.cookies?.set?.forEach(c => store.set(c.name, c.value, c.options))
    return { prisma }
  }

  it('creates then deletes a project', async () => {
    const { prisma } = await ctxWithLogin()
    await prisma.project.upsert({
      where: { id_locale: { id: 'proj1', locale: 'en' } },
      update: { title: 'Project One', role: 'Dev', period: '2024', summary: 'Summary' },
      create: { id: 'proj1', locale: 'en', title: 'Project One', role: 'Dev', period: '2024', summary: 'Summary' }
    })
    invalidateAggregateCache('en')
    const afterCreate = await prisma.project.findMany({ where: { id: 'proj1', locale: 'en' } })
    expect(afterCreate.length).toBe(1)
    await prisma.project.delete({ where: { id_locale: { id: 'proj1', locale: 'en' } } })
    invalidateAggregateCache('en')
    const afterDelete = await prisma.project.findMany({ where: { id: 'proj1', locale: 'en' } })
    expect(afterDelete.length).toBe(0)
  })
})
