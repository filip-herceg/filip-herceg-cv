import { describe, it, expect, vi, beforeEach } from 'vitest'

// hoisted mocks (must be available during mock factory evaluation)
const { requireAdmin, getAggregate, invalidateSpy } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ ok: true })),
  getAggregate: vi.fn(),
  invalidateSpy: vi.fn()
}))

vi.mock('@/lib/auth/cookies', () => ({ NextCookieStore: class { async init() { return this } } }))
vi.mock('@/lib/auth/context', () => ({ buildAuthContext: () => ({ user: { id: 'admin' } }) }))
vi.mock('@/lib/auth/guard', () => ({ requireAdmin }))
vi.mock('@/lib/cv/service', () => ({
  getAggregate: (...a: any[]) => getAggregate(...a),
  invalidateAggregateCache: (...a: any[]) => invalidateSpy(...a)
}))
vi.mock('@/lib/metrics', () => ({
  cvEntityMutationsTotal: { inc: () => {} },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  authLoginAttemptsTotal: { inc: () => {} },
  authActiveSessions: { set: () => {}, inc: () => {}, dec: () => {} }
}))

import { GET, POST } from '@/app/api/admin/cv/route'

describe('admin cv aggregate route', () => {
  beforeEach(() => { requireAdmin.mockImplementation(async () => ({ ok: true })); getAggregate.mockReset(); invalidateSpy.mockReset() })

  it('GET unauthorized', async () => {
    requireAdmin.mockImplementationOnce(async () => ({ ok: false, status: 401, body: { error: 'UNAUTHORIZED' } }))
    const res = await GET(new Request('http://test/api/admin/cv'))
    expect(res.status).toBe(401)
  })

  it('GET success default locale', async () => {
    getAggregate.mockResolvedValueOnce({ data: { skills: [] }, design: { theme: 'light' }, source: { version: 1 } })
    const res = await GET(new Request('http://test/api/admin/cv'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual({ skills: [] })
    expect(getAggregate).toHaveBeenCalledWith('en')
  })

  it('GET success custom locale', async () => {
    getAggregate.mockResolvedValueOnce({ data: { skills: [] }, design: {}, source: {} })
    const res = await GET(new Request('http://test/api/admin/cv?locale=de'))
    expect(res.status).toBe(200)
    expect(getAggregate).toHaveBeenCalledWith('de')
  })

  it('POST unauthorized', async () => {
    requireAdmin.mockImplementationOnce(async () => ({ ok: false, status: 401, body: { error: 'UNAUTHORIZED' } }))
    const res = await POST(new Request('http://test/api/admin/cv', { method: 'POST', body: JSON.stringify({ locale: 'en' }) }))
    expect(res.status).toBe(401)
  })

  it('POST invalidates (explicit locale)', async () => {
    const res = await POST(new Request('http://test/api/admin/cv', { method: 'POST', body: JSON.stringify({ locale: 'fr' }) }))
    expect(res.status).toBe(200)
    expect(invalidateSpy).toHaveBeenCalledWith('fr')
  })

  it('POST invalid JSON uses default locale', async () => {
    const res = await POST(new Request('http://test/api/admin/cv', { method: 'POST', body: 'not-json' }))
    expect(res.status).toBe(200)
    expect(invalidateSpy).toHaveBeenCalledWith('en')
  })
})
