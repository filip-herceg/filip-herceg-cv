import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks (avoid TDZ issues)
const { requireAdmin } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ ok: true })),
}))
const incSpy = vi.fn()
const invalidateSpy = vi.fn()

vi.mock('@/lib/auth/cookies', () => ({
  NextCookieStore: class { async init() { return this } },
}))
vi.mock('@/lib/auth/context', () => ({ buildAuthContext: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/lib/auth/guard', () => ({ requireAdmin }))
vi.mock('@/lib/metrics', () => ({
  cvEntityMutationsTotal: { inc: (...args: any[]) => incSpy(...args) },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  authLoginAttemptsTotal: { inc: () => {} },
  authActiveSessions: { set: () => {}, inc: () => {}, dec: () => {} }
}))
vi.mock('@/lib/cv/service', () => ({
  invalidateAggregateCache: (...a: any[]) => invalidateSpy(...a),
  getPrisma: () => ({ project: { findUnique, upsert, delete: del } } as any),
}))

// Prisma mock with programmable behaviors per test
const findUnique = vi.fn()
const upsert = vi.fn()
const del = vi.fn()
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({ project: { findUnique, upsert, delete: del } })),
}))

// Now import the route handlers under test
import { POST, DELETE } from '@/app/api/admin/entity/project/route'

const basePayload = {
  id: 'proj-1',
  locale: 'en',
  title: 'Project One',
  role: 'Engineer',
  period: '2020',
  company: 'ACME',
  summary: 'Summary',
}

describe('admin project route', () => {
  beforeEach(() => {
    incSpy.mockClear(); invalidateSpy.mockClear(); requireAdmin.mockImplementation(async () => ({ ok: true }))
    findUnique.mockReset(); upsert.mockReset(); del.mockReset()
  })

  it('returns 401 when unauthorized', async () => {
    requireAdmin.mockImplementationOnce(async () => ({ ok: false, status: 401, body: { error: 'UNAUTHORIZED' } }))
    const res = await POST(new Request('http://test/api/admin/entity/project', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(401)
  })

  it('returns 400 on validation error', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/project', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION')
  })

  it('handles invalid JSON body (parse fallback -> validation)', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/project', { method: 'POST', body: 'not-json' }))
    expect(res.status).toBe(400)
  })

  it('creates new project (no arrays => null JSON columns)', async () => {
    findUnique.mockResolvedValueOnce(null)
    upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/project', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(200)
    expect(invalidateSpy).toHaveBeenCalledWith('en')
    // action label create (existing null)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'project', action: 'create', result: 'success' })
  })

  it('updates existing project (arrays serialized)', async () => {
    findUnique.mockResolvedValueOnce({ id: 'proj-1' })
    upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/project', { method: 'POST', body: JSON.stringify({ ...basePayload, highlights: ['h1'], stack: ['ts'], links: [{ label: 'GitHub', url: 'https://github.com' }], impact: 'Great impact' }) }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'project', action: 'update', result: 'success' })
  })

  it('handles DB error', async () => {
    findUnique.mockResolvedValueOnce(null)
    upsert.mockRejectedValueOnce(new Error('db'))
    const res = await POST(new Request('http://test/api/admin/entity/project', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(500)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'project', action: 'create', result: 'error' })
  })

  it('DELETE 400 missing id', async () => {
    const res = await DELETE(new Request('http://test/api/admin/entity/project?locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(400)
  })

  it('DELETE success', async () => {
    del.mockResolvedValueOnce({})
    const res = await DELETE(new Request('http://test/api/admin/entity/project?id=proj-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'project', action: 'delete', result: 'success' })
  })

  it('DELETE error still returns deleted', async () => {
    del.mockRejectedValueOnce(new Error('boom'))
    const res = await DELETE(new Request('http://test/api/admin/entity/project?id=proj-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'project', action: 'delete', result: 'error' })
  })
})
