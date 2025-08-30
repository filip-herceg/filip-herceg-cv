import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted guard mock
const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn(async () => ({ ok: true })) }))
const incSpy = vi.fn()
const invalidateSpy = vi.fn()

vi.mock('@/lib/auth/cookies', () => ({ NextCookieStore: class { async init() { return this } } }))
vi.mock('@/lib/auth/context', () => ({ buildAuthContext: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/lib/auth/guard', () => ({ requireAdmin }))
vi.mock('@/lib/metrics', () => ({ cvEntityMutationsTotal: { inc: (...a: any[]) => incSpy(...a) } }))
vi.mock('@/lib/cv/service', () => ({ invalidateAggregateCache: (...a: any[]) => invalidateSpy(...a) }))

const findUnique = vi.fn()
const upsert = vi.fn()
const del = vi.fn()
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => ({ education: { findUnique, upsert, delete: del } })) }))

import { POST, DELETE } from '@/app/api/admin/entity/education/route'

const basePayload = { id: 'edu-1', locale: 'en', institution: 'Uni', degree: 'BSc', field: 'CS', period: '2019', location: 'Somewhere', grade: 'A', summary: 'Summary' }

describe('admin education route', () => {
  beforeEach(() => { incSpy.mockClear(); invalidateSpy.mockClear(); requireAdmin.mockImplementation(async () => ({ ok: true })); findUnique.mockReset(); upsert.mockReset(); del.mockReset() })

  it('401 unauthorized', async () => {
    requireAdmin.mockImplementationOnce(async () => ({ ok: false, status: 401, body: { error: 'UNAUTHORIZED' } }))
    const res = await POST(new Request('http://test/api/admin/entity/education', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(401)
  })

  it('400 validation', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/education', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it('invalid JSON body triggers validation (parse fallback)', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/education', { method: 'POST', body: 'not-json' }))
    expect(res.status).toBe(400)
  })

  it('create with null highlightsJson', async () => {
    findUnique.mockResolvedValueOnce(null); upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/education', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'education', action: 'create', result: 'success' })
  })

  it('update with highlights', async () => {
    findUnique.mockResolvedValueOnce({ id: 'edu-1' }); upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/education', { method: 'POST', body: JSON.stringify({ ...basePayload, highlights: ['h1'] }) }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'education', action: 'update', result: 'success' })
  })

  it('DB error path', async () => {
    findUnique.mockResolvedValueOnce(null); upsert.mockRejectedValueOnce(new Error('db'))
    const res = await POST(new Request('http://test/api/admin/entity/education', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(500)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'education', action: 'create', result: 'error' })
  })

  it('DELETE missing id', async () => {
    const res = await DELETE(new Request('http://test/api/admin/entity/education?locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(400)
  })

  it('DELETE success', async () => {
    del.mockResolvedValueOnce({})
    const res = await DELETE(new Request('http://test/api/admin/entity/education?id=edu-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'education', action: 'delete', result: 'success' })
  })

  it('DELETE error still returns deleted', async () => {
    del.mockRejectedValueOnce(new Error('x'))
    const res = await DELETE(new Request('http://test/api/admin/entity/education?id=edu-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'education', action: 'delete', result: 'error' })
  })
})
