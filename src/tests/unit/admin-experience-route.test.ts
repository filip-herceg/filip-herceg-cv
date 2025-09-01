import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted for guard to avoid TDZ
const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn(async () => ({ ok: true })) }))
const incSpy = vi.fn()
const invalidateSpy = vi.fn()

vi.mock('@/lib/auth/cookies', () => ({ NextCookieStore: class { async init() { return this } } }))
vi.mock('@/lib/auth/context', () => ({ buildAuthContext: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/lib/auth/guard', () => ({ requireAdmin }))
vi.mock('@/lib/metrics', () => ({
  cvEntityMutationsTotal: { inc: (...args: any[]) => incSpy(...args) },
  // Provide noop exports accessed indirectly by storage/sample data paths
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) }
}))
vi.mock('@/lib/cv/service', () => ({ invalidateAggregateCache: (...a: any[]) => invalidateSpy(...a) }))

const findUnique = vi.fn()
const upsert = vi.fn()
const del = vi.fn()
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => ({ experience: { findUnique, upsert, delete: del } })) }))

import { POST, DELETE } from '@/app/api/admin/entity/experience/route'

const basePayload = {
  id: 'exp-1',
  locale: 'en',
  company: 'ACME',
  role: 'Engineer',
  period: '2021',
}

describe('admin experience route', () => {
  beforeEach(() => {
    incSpy.mockClear(); invalidateSpy.mockClear(); requireAdmin.mockImplementation(async () => ({ ok: true }))
    findUnique.mockReset(); upsert.mockReset(); del.mockReset()
  })

  it('401 when unauthorized', async () => {
    requireAdmin.mockImplementationOnce(async () => ({ ok: false, status: 401, body: { error: 'UNAUTHORIZED' } }))
    const res = await POST(new Request('http://test/api/admin/entity/experience', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(401)
  })

  it('400 validation error', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/experience', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it('invalid JSON body triggers validation (parse fallback)', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/experience', { method: 'POST', body: 'not-json' }))
    expect(res.status).toBe(400)
  })

  it('create (no arrays)', async () => {
    findUnique.mockResolvedValueOnce(null); upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/experience', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'experience', action: 'create', result: 'success' })
  })

  it('update with arrays serialized', async () => {
    findUnique.mockResolvedValueOnce({ id: 'exp-1' }); upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/experience', { method: 'POST', body: JSON.stringify({ ...basePayload, achievements: [{ summary: 'Did X', impact: 'Big', metrics: ['+10%'] }], stack: ['ts'], tags: ['backend'] }) }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'experience', action: 'update', result: 'success' })
  })

  it('DB error path', async () => {
    findUnique.mockResolvedValueOnce(null); upsert.mockRejectedValueOnce(new Error('db'))
    const res = await POST(new Request('http://test/api/admin/entity/experience', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(500)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'experience', action: 'create', result: 'error' })
  })

  it('DELETE missing id', async () => {
    const res = await DELETE(new Request('http://test/api/admin/entity/experience?locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(400)
  })

  it('DELETE success', async () => {
    del.mockResolvedValueOnce({})
    const res = await DELETE(new Request('http://test/api/admin/entity/experience?id=exp-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'experience', action: 'delete', result: 'success' })
  })

  it('DELETE error', async () => {
    del.mockRejectedValueOnce(new Error('x'))
    const res = await DELETE(new Request('http://test/api/admin/entity/experience?id=exp-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'experience', action: 'delete', result: 'error' })
  })
})
