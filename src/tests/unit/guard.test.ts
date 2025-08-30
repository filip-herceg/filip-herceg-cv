import { describe, it, expect, vi } from 'vitest'
// IMPORTANT: mock before importing the module under test so guard.ts picks up the mocked currentUser
vi.mock('@/lib/auth/session', async () => {
  const actual = await vi.importActual<any>('@/lib/auth/session')
  return {
    ...actual,
    // Lightweight deterministic mock that derives a fake user from the session cookie value
    currentUser: async (ctx: any) => {
      const cookieName = ctx.config?.sessionCookieName || 'cv_admin_session'
      const sid = ctx.cookies?.get?.(cookieName)?.value
      if (!sid) return { user: null }
      return { user: { id: 'uid-' + sid, username: 'gtest' } }
    },
  }
})

import { requireAdmin } from '@/lib/auth/guard'
import { buildAuthContext } from '@/lib/auth/context'
import { MemoryCookieStore } from '@/lib/auth/cookies'

describe('requireAdmin', () => {
  it('fails when no session cookie present', async () => {
    const ctx = buildAuthContext({ store: new MemoryCookieStore() })
    const res = await requireAdmin(ctx)
    expect(res.ok).toBe(false)
    expect(res.status).toBe(401)
  })

  it('succeeds with valid session', async () => {
    const store = new MemoryCookieStore(); store.set('cv_admin_session', 'abc', { path: '/', httpOnly: true })
    const ctx = buildAuthContext({ store })
    const res = await requireAdmin(ctx)
    expect(res.ok).toBe(true)
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('gtest')
  })
})