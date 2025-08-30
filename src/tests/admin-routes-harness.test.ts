import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createHarness, jsonRequest, deleteRequest } from './route-harness'
import { PrismaClient } from '@prisma/client'
import { cvEntityMutationsTotal } from '@/lib/metrics'

// Mock next/headers cookies to use MemoryCookieStore from harness.
// We dynamically delegate to the harness's store (set on globalThis for simplicity per test file scope).
vi.mock('next/headers', () => ({
  cookies: async () => (globalThis as any).__harnessStore,
}))

// Minimal admin user + session creation via Prisma for auth guard.
const prisma = new PrismaClient()

async function ensureAdmin() {
  const user = await (prisma as any).adminUser.upsert({
    where: { username: 'admin' },
    create: { username: 'admin', passwordHash: 'x' },
    update: {},
  })
  const session = await (prisma as any).session.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) } })
  return session
}

function counterValue(entity: string, action: string, result: string) {
  const data = (cvEntityMutationsTotal as any).get().values as Array<any>
  const found = data.find(v => v.labels.entity === entity && v.labels.action === action && v.labels.result === result)
  return found ? found.value : 0
}

describe('admin entity routes (harness)', () => {
  const base = 'http://localhost'
  beforeAll(async () => {
    // Push schema (idempotent) for sqlite test db
    // Rely on existing test setup for DATABASE_URL env.
  })

  it('rejects unauthenticated skill create', async () => {
    const h = createHarness()
    ;(globalThis as any).__harnessStore = h.store
    const { POST } = await import('@/app/api/admin/entity/skill/route')
    const res = await POST(jsonRequest(base + '/api/admin/entity/skill', { id: 's1', name: 'TypeScript', category: 'Language', locale: 'en' }))
    expect(res.status).toBe(401)
  })

  it('creates then deletes experience', async () => {
    const h = createHarness()
    ;(globalThis as any).__harnessStore = h.store
    const session = await ensureAdmin()
    h.setAdminSession(session.id)
    const { POST, DELETE } = await import('@/app/api/admin/entity/experience/route')

  const start = counterValue('experience', 'create', 'success')
    const createBody = { id: 'exp1', company: 'Acme', role: 'Engineer', period: '2020-2022', locale: 'en' }
    const res = await POST(jsonRequest(base + '/api/admin/entity/experience', createBody))
    expect(res.status).toBe(200)
    const text = await res.text(); expect(text).toContain('ok')
  const after = counterValue('experience', 'create', 'success')
    expect(after).toBe(start + 1)

  const delStart = counterValue('experience', 'delete', 'success')
    const delRes = await DELETE(deleteRequest(base + '/api/admin/entity/experience?id=exp1&locale=en'))
    expect(delRes.status).toBe(200)
  const delAfter = counterValue('experience', 'delete', 'success')
    expect(delAfter).toBe(delStart + 1)
  })

  it('creates skill (validation fail then success) and updates project', async () => {
    const h = createHarness(); (globalThis as any).__harnessStore = h.store
    const session = await ensureAdmin(); h.setAdminSession(session.id)
    const { POST: SkillPOST, DELETE: SkillDELETE } = await import('@/app/api/admin/entity/skill/route')
    // validation failure (missing category)
    const bad = await SkillPOST(jsonRequest(base + '/api/admin/entity/skill', { id: 'sk1', name: 'React', locale: 'en' }))
    expect(bad.status).toBe(400)
  const good = await SkillPOST(jsonRequest(base + '/api/admin/entity/skill', { id: 'sk1', name: 'React', category: 'Library', level: 'advanced', years: 5, tags: ['ui'], locale: 'en' }))
  expect(good.status).toBe(200)
  // update path (existing -> action update)
  const updated = await SkillPOST(jsonRequest(base + '/api/admin/entity/skill', { id: 'sk1', name: 'ReactJS', category: 'Library', level: 'advanced', years: 6, tags: ['ui','hooks'], locale: 'en' }))
  expect(updated.status).toBe(200)
  // missing id branch
  const missing = await SkillDELETE(deleteRequest(base + '/api/admin/entity/skill'))
  expect(missing.status).toBe(400)
  const del = await SkillDELETE(deleteRequest(base + '/api/admin/entity/skill?id=sk1&locale=en'))
  expect(del.status).toBe(200)

    const { POST: ProjectPOST } = await import('@/app/api/admin/entity/project/route')
    const projectRes = await ProjectPOST(jsonRequest(base + '/api/admin/entity/project', { id: 'p1', title: 'Proj', role: 'Dev', period: '2024', summary: 'Sum', locale: 'en' }))
    expect(projectRes.status).toBe(200)
  })

  it('creates certification, education, trait, hobby then deletes them', async () => {
    const h = createHarness(); (globalThis as any).__harnessStore = h.store
    const session = await ensureAdmin(); h.setAdminSession(session.id)
    const { POST: CertPOST, DELETE: CertDELETE } = await import('@/app/api/admin/entity/certification/route')
    const { POST: EduPOST, DELETE: EduDELETE } = await import('@/app/api/admin/entity/education/route')
    const { POST: TraitPOST, DELETE: TraitDELETE } = await import('@/app/api/admin/entity/trait/route')
    const { POST: HobbyPOST, DELETE: HobbyDELETE } = await import('@/app/api/admin/entity/hobby/route')

    expect((await CertPOST(jsonRequest(base + '/api/admin/entity/certification', { id: 'c1', name: 'AWS', issuer: 'Amazon', year: 2024, locale: 'en' }))).status).toBe(200)
    expect((await EduPOST(jsonRequest(base + '/api/admin/entity/education', { id: 'ed1', institution: 'Uni', degree: 'BSc', field: 'CS', period: '2010-2013', locale: 'en' }))).status).toBe(200)
    expect((await TraitPOST(jsonRequest(base + '/api/admin/entity/trait', { id: 't1', name: 'Leadership', category: 'Soft', locale: 'en' }))).status).toBe(200)
    expect((await HobbyPOST(jsonRequest(base + '/api/admin/entity/hobby', { id: 'h1', name: 'Cycling', locale: 'en' }))).status).toBe(200)

    expect((await CertDELETE(deleteRequest(base + '/api/admin/entity/certification?id=c1&locale=en'))).status).toBe(200)
    expect((await EduDELETE(deleteRequest(base + '/api/admin/entity/education?id=ed1&locale=en'))).status).toBe(200)
    expect((await TraitDELETE(deleteRequest(base + '/api/admin/entity/trait?id=t1&locale=en'))).status).toBe(200)
    expect((await HobbyDELETE(deleteRequest(base + '/api/admin/entity/hobby?id=h1&locale=en'))).status).toBe(200)
  })
})

describe('requireAdmin direct', () => {
  it('returns unauthorized without session', async () => {
    const { requireAdmin } = await import('@/lib/auth/guard')
    const { buildAuthContext } = await import('@/lib/auth/context')
    const { MemoryCookieStore } = await import('@/lib/auth/cookies')
    const ctx = buildAuthContext({ store: new MemoryCookieStore() })
    const res = await requireAdmin(ctx)
    expect(res.ok).toBe(false)
    expect(res.status).toBe(401)
  })

  it('authorizes with valid session (guard success path)', async () => {
    const { requireAdmin } = await import('@/lib/auth/guard')
    const { buildAuthContext } = await import('@/lib/auth/context')
    const { MemoryCookieStore } = await import('@/lib/auth/cookies')
    // Create admin + session
    const session = await ensureAdmin()
    const store = new MemoryCookieStore(); store.set('cv_admin_session', session.id, { path: '/', httpOnly: true })
    const ctx = buildAuthContext({ store })
    const res = await requireAdmin(ctx)
    expect(res.ok).toBe(true)
  })
})