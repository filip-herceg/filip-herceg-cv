export interface BackoffConfig {
  baseMs: number
  maxMs: number
  jitterFraction: number
  ttlSeconds: number
}

export interface AuthRuntimeConfig {
  sessionCookieName: string
  csrfCookieName: string
  sessionTtlMs: number
  slidingRenewalFraction: number
  bootstrap: { username: string; password?: string }
  production: boolean
  backoff: BackoffConfig
}

function num(name: string, def: number): number {
  const v = process.env[name]
  if (!v) return def
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : def
}

export function loadAuthConfig(): AuthRuntimeConfig {
  return {
    sessionCookieName: 'cv_admin_session',
    csrfCookieName: 'cv_admin_csrf',
    sessionTtlMs: num('AUTH_SESSION_TTL_MS', 12 * 3600 * 1000),
    slidingRenewalFraction: num('AUTH_SESSION_RENEW_FRACTION', 0.5),
    bootstrap: {
      username: process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin',
      password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
    },
    production: process.env.NODE_ENV === 'production',
    backoff: {
      baseMs: num('AUTH_BACKOFF_BASE_MS', 250),
      maxMs: num('AUTH_BACKOFF_MAX_MS', 2000),
      jitterFraction: num('AUTH_BACKOFF_JITTER_FRACTION', 0),
      ttlSeconds: num('AUTH_RATE_LIMIT_TTL_SECONDS', 600),
    },
  }
}
