import { describe, it, expect, vi } from 'vitest'

// These tests rely on dev fallback (no DB, default secret)
// Ensure NODE_ENV is not 'production' when running vitest.

describe('share short-link (dev fallback)', () => {
  it('mints a token and resolves to /cv/print with presetId in Location', async () => {
    // Force dev fallback path (no DB)
    vi.resetModules()
    process.env.SHARE_TOKEN_SECRET = 'test-secret-123'
    vi.doMock('@/lib/cv/service', () => ({ canUseDatabase: () => false, getPrisma: () => ({}) }))

    const { POST: mint } = await import('@/app/api/share/token/route')
    const { GET: resolve } = await import('@/app/s/[token]/route')

    const presetId = 'demo'
    const mintRes = await mint(new Request('http://test/api/share/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ presetId, ttlSeconds: 300 }),
    }) as any)
    expect(mintRes.status).toBe(200)
    const mintJson = await mintRes.json() as { token: string }
    expect(mintJson.token).toBeTruthy()

    const token = mintJson.token
    const req = new Request(`http://example.local/s/${token}`, {
      headers: { 'x-forwarded-proto': 'http', 'x-forwarded-host': 'example.local' },
    })
    const res = await resolve(req as any, { params: Promise.resolve({ token }) } as any)
    expect(res.status).toBe(302)
    const location = res.headers.get('Location') || res.headers.get('location')
    expect(location).toBeTruthy()
    expect(location).toContain('/cv/print')
    expect(location).toContain(`presetId=${presetId}`)
  })
})
