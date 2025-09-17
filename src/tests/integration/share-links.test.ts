/* eslint-disable max-nested-callbacks */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Provide a secret so sign/verify work deterministically
const PREV_SECRET = process.env.SHARE_TOKEN_SECRET
beforeAll(() => {
  process.env.SHARE_TOKEN_SECRET = 'test-secret-123'
})
afterAll(() => {
  if (PREV_SECRET) {
    process.env.SHARE_TOKEN_SECRET = PREV_SECRET
  } else {
    delete process.env.SHARE_TOKEN_SECRET
  }
  vi.resetModules()
})

describe('share links API and resolver', () => {
  it('POST /api/share/token mints a token', async () => {
  vi.resetModules()
    // Mock getPrisma to avoid real DB
  vi.doMock('@/lib/cv/service', () => ({
      canUseDatabase: () => true,
      getPrisma: () => ({
        shareToken: {
          async create({ data }: { data: { presetId: string; expiresAt: Date } }) {
            return { id: 'tok_123', ...data }
          },
        },
      }),
    }))

    const { POST } = await import('@/app/api/share/token/route')
    const res = await POST(new Request('http://test/api/share/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ presetId: 'preset-abc', ttlSeconds: 3600 }),
    }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('tok_123')
    expect(typeof json.token).toBe('string')
    expect(json.expiresAt).toBeTruthy()
  })

  it('POST /api/share/revoke revokes by id', async () => {
  vi.resetModules()
  vi.doMock('@/lib/cv/service', () => ({
      canUseDatabase: () => true,
      getPrisma: () => ({
        shareToken: {
          async delete({ where: { id } }: { where: { id: string } }) {
            return { id }
          },
        },
      }),
    }))

    const { POST } = await import('@/app/api/share/revoke/route')
    const res = await POST(new Request('http://test/api/share/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'tok_123' }),
    }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('GET /s/[token] redirects for valid token and existing record', async () => {
    // Mock prisma and import verify/sign utils
  vi.resetModules()
  vi.doMock('@/lib/cv/service', () => ({
      canUseDatabase: () => true,
      getPrisma: () => ({
        shareToken: {
          async findUnique({ where: { id } }: { where: { id: string } }) {
            return { id, presetId: 'preset-zzz', expiresAt: new Date() }
          },
        },
      }),
    }))
    const { signShareToken } = await import('@/lib/share-token')
    const token = signShareToken({ id: 'tok_abc', presetId: 'preset-zzz', exp: Math.floor(Date.now() / 1000) + 300, scope: 'latest_preset_export' })

    const { GET } = await import('@/app/s/[token]/route')
    const req = new Request('http://example.local/s/' + encodeURIComponent(token), {
      headers: { 'x-forwarded-proto': 'http', 'x-forwarded-host': 'example.local' },
    }) as any
  const res = await GET(req, { params: Promise.resolve({ token }) } as any)
    // Expect a redirect to /cv/print with presetId
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') || ''
    expect(loc).toContain('/cv/print')
    expect(loc).toContain('presetId=preset-zzz')
  })

  it('GET /s/[token] returns 400 for invalid/expired token', async () => {
    // No prisma hit should occur because verification fails first
  vi.resetModules()
  vi.doMock('@/lib/cv/service', () => ({ canUseDatabase: () => true, getPrisma: () => ({}) }))
    const { GET } = await import('@/app/s/[token]/route')
    const req = new Request('http://example.local/s/bad', {
      headers: { 'x-forwarded-proto': 'http', 'x-forwarded-host': 'example.local' },
    }) as any
  const res = await GET(req, { params: Promise.resolve({ token: 'bad' }) } as any)
    expect(res.status).toBe(400)
  })
})
