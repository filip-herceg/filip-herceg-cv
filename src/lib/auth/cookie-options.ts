import type { AuthContext, CookieOptions } from './types'

// Centralized builders for cookie option objects to avoid duplication and
// ensure consistent security flags. All cookies default to path '/'.

export function buildSessionCookieOptions(ctx: AuthContext, expires: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: ctx.config.production,
    path: '/',
    expires,
  }
}

export function buildCsrfCookieOptions(ctx: AuthContext): CookieOptions {
  // CSRF token must be readable by client JS; intentional httpOnly: false.
  return {
    httpOnly: false,
    sameSite: 'lax',
    secure: ctx.config.production,
    path: '/',
  }
}
