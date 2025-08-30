import { describe, it, expect, vi, beforeEach } from 'vitest'

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn(async () => ({ ok: true })) }))
const incSpy = vi.fn(); const invalidateSpy = vi.fn()

vi.mock('@/lib/auth/cookies', () => ({ NextCookieStore: class { async init() { return this } } }))
vi.mock('@/lib/auth/context', () => ({ buildAuthContext: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/lib/auth/guard', () => ({ requireAdmin }))
vi.mock('@/lib/metrics', () => ({ cvEntityMutationsTotal: { inc: (...a: any[]) => incSpy(...a) } }))
vi.mock('@/lib/cv/service', () => ({ invalidateAggregateCache: (...a: any[]) => invalidateSpy(...a) }))

const findUnique = vi.fn(); const upsert = vi.fn(); const del = vi.fn()
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => ({ certification: { findUnique, upsert, delete: del } })) }))

import { POST, DELETE } from '@/app/api/admin/entity/certification/route'

const basePayload = { id: 'cert-1', locale: 'en', name: 'Cert', issuer: 'Org', year: 2024, url: 'https://example.com' }

describe('admin certification route', () => {
  beforeEach(() => { incSpy.mockClear(); invalidateSpy.mockClear(); requireAdmin.mockImplementation(async () => ({ ok: true })); findUnique.mockReset(); upsert.mockReset(); del.mockReset() })

  it('401 unauthorized', async () => {
    requireAdmin.mockImplementationOnce(async () => ({ ok: false, status: 401, body: { error: 'UNAUTHORIZED' } }))
    const res = await POST(new Request('http://test/api/admin/entity/certification', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(401)
  })

  it('400 validation', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/certification', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it('invalid JSON body triggers validation (parse fallback)', async () => {
    const res = await POST(new Request('http://test/api/admin/entity/certification', { method: 'POST', body: 'not-json' }))
    expect(res.status).toBe(400)
  })

  it('create', async () => {
    findUnique.mockResolvedValueOnce(null); upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/certification', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'certification', action: 'create', result: 'success' })
  })

  it('update path', async () => {
    findUnique.mockResolvedValueOnce({ id: 'cert-1' }); upsert.mockResolvedValueOnce({})
    const res = await POST(new Request('http://test/api/admin/entity/certification', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'certification', action: 'update', result: 'success' })
  })

  it('DB error', async () => {
    findUnique.mockResolvedValueOnce(null); upsert.mockRejectedValueOnce(new Error('db'))
    const res = await POST(new Request('http://test/api/admin/entity/certification', { method: 'POST', body: JSON.stringify(basePayload) }))
    expect(res.status).toBe(500)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'certification', action: 'create', result: 'error' })
  })

  it('DELETE missing id', async () => {
    const res = await DELETE(new Request('http://test/api/admin/entity/certification?locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(400)
  })

  it('DELETE success', async () => {
    del.mockResolvedValueOnce({})
    const res = await DELETE(new Request('http://test/api/admin/entity/certification?id=cert-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'certification', action: 'delete', result: 'success' })
  })

  it('DELETE error', async () => {
    del.mockRejectedValueOnce(new Error('x'))
    const res = await DELETE(new Request('http://test/api/admin/entity/certification?id=cert-1&locale=en', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(incSpy).toHaveBeenCalledWith({ entity: 'certification', action: 'delete', result: 'error' })
  })
})
