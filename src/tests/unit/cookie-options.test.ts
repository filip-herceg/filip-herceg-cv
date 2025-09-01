import { describe, it, expect } from 'vitest'

describe('cookie option builders', () => {
  it('builds secure=false in non-production', async () => {
    const { buildSessionCookieOptions, buildCsrfCookieOptions } = await import('@/lib/auth/cookie-options')
    const ctx: any = { config: { production: false } } // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = buildSessionCookieOptions(ctx, new Date())
    const csrf = buildCsrfCookieOptions(ctx)
    expect(session.secure).toBe(false)
    expect(session.httpOnly).toBe(true)
    expect(csrf.secure).toBe(false)
    expect(csrf.httpOnly).toBe(false)
  })
  it('builds secure=true in production', async () => {
    const { buildSessionCookieOptions, buildCsrfCookieOptions } = await import('@/lib/auth/cookie-options')
    const ctx: any = { config: { production: true } } // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = buildSessionCookieOptions(ctx, new Date())
    const csrf = buildCsrfCookieOptions(ctx)
    expect(session.secure).toBe(true)
    expect(csrf.secure).toBe(true)
  })
})
