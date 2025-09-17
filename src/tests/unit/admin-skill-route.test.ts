import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock heavy modules before importing the route
vi.mock('@/lib/cv/service', () => ({
  invalidateAggregateCache: () => {},
  getPrisma: () => ({ skill: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() } } as any),
}))
// Provide metrics mocks (avoid accessing real prom-client in unit context)
vi.mock('@/lib/metrics', () => ({
  cvEntityMutationsTotal: { inc: () => {} },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  authLoginAttemptsTotal: { inc: () => {} },
  authActiveSessions: { inc: () => {}, dec: () => {}, set: () => {} }
}))
// Force auth to always succeed so we focus on route logic
vi.mock('@/lib/auth/guard', () => ({ requireAdmin: async () => ({ ok: true, user: { id: 'u1' } }) }))
// Mock cookie store used by route to avoid Next.js environment dependency
vi.mock('@/lib/auth/cookies', () => ({
  NextCookieStore: class {
    async init() { return this }
  },
}))

// Provide a lightweight PrismaClient substitute; route only needs constructor.
vi.mock('@prisma/client', () => {
  class MockPrisma { public skill = { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() } }
  return { PrismaClient: MockPrisma as any }
})

// Mock skill handler to control success/update/error paths without coupling to prisma internals.
vi.mock('@/lib/admin/skill-handler', () => {
  const existing = new Set<string>()
  return {
    upsertSkill: async (_prisma: any, input: any) => {
      if (input.id === 'fail') throw new Error('db fail')
      const key = `${input.id}:${input.locale}`
      const action = existing.has(key) ? 'update' : 'create'
      existing.add(key)
      return { action }
    },
    deleteSkill: async (_prisma: any, id: string) => {
      if (id.includes('err')) throw new Error('boom')
      return 'deleted'
    },
  }
})

// Import after mocks so instrumentation counts lines inside route file
import { POST, DELETE } from '@/app/api/admin/entity/skill/route'

function req(body: any) {
  return new Request('http://test.local/api/admin/entity/skill', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin skill route handlers', () => {
  // still create a prisma instance to mirror route behaviour (not strictly needed for assertions)
  beforeEach(async () => { await import('@prisma/client') })

  it('returns 400 on validation error (missing id)', async () => {
    const res = await POST(req({ locale: 'en', name: 'X', category: 'Cat' }))
    expect(res.status).toBe(400)
  })

  it('handles invalid JSON body (parse failure -> validation)', async () => {
    const badReq = new Request('http://test.local/api/admin/entity/skill', { method: 'POST', body: 'not-json', headers: { 'content-type': 'application/json' } })
    const res = await POST(badReq)
    expect(res.status).toBe(400)
  })

  it('creates then updates a skill (action coverage)', async () => {
    const createRes = await POST(req({ id: 's1', locale: 'en', name: 'React', category: 'Library' }))
    expect(createRes.status).toBe(200)
    const updateRes = await POST(req({ id: 's1', locale: 'en', name: 'ReactJS', category: 'Library' }))
    expect(updateRes.status).toBe(200)
  })

  it('handles DB error during create', async () => {
    const res = await POST(req({ id: 'fail', locale: 'en', name: 'Valid Name', category: 'Framework' }))
    expect(res.status).toBe(500)
  })

  it('delete validations and success/error branches', async () => {
    // missing id
    const missing = await DELETE(new Request('http://test.local/api/admin/entity/skill?locale=en', { method: 'DELETE' }))
    expect(missing.status).toBe(400)

    // success path
    const ok = await DELETE(new Request('http://test.local/api/admin/entity/skill?id=s1&locale=en', { method: 'DELETE' }))
    expect(ok.status).toBe(200)
    // error branch (deleteSkill throws -> route still returns deleted)
    const err = await DELETE(new Request('http://test.local/api/admin/entity/skill?id=err123&locale=en', { method: 'DELETE' }))
  expect(err.status).toBe(500)
  const body = await err.json()
  expect(body.error).toBe('DELETE_FAILED')
  })
})
