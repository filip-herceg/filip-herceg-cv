import pino from 'pino'
import crypto from 'node:crypto'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
})

export function withRequest<T extends Record<string, unknown>>(fields: T) {
  return logger.child(fields)
}

// Privacy level (evaluated dynamically so tests can toggle)
function privacyLevel() {
  return (process.env.LOG_PRIVACY || 'low').toLowerCase()
}

// Very small scrubber for obvious PII
function scrubValue(val: unknown, redactions: string[]): unknown {
  if (typeof val === 'string') {
    // Email pattern
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) { redactions.push('email'); return '[redacted.email]' }
  if (privacyLevel() === 'high') {
      // Remove domains in URLs (keep path)
      try {
        if (/^https?:\/\//i.test(val)) {
          const u = new URL(val)
          redactions.push('url.host')
          return u.protocol + '//' + '[redacted.host]' + u.pathname + (u.search||'')
        }
      } catch { /* ignore */ }
    }
  }
  return val
}

export function scrubObject<T extends Record<string, unknown>>(obj: T): { cleaned: Record<string, unknown>; redactions: string[] } {
  const cleaned: Record<string, unknown> = {}
  const redactions: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    cleaned[k] = scrubValue(v, redactions)
  }
  return { cleaned, redactions }
}

  // Create a child logger enriched with per-request context. Tests sometimes invoke
  // route handlers without passing an actual Fetch API Request object; we make
  // this helper resilient to undefined or partial inputs so those direct calls
  // still work and logging doesn't throw.
  export function withRequestContext(req?: Request | { headers?: any; url?: string; method?: string }) {
    try {
      const headers: any = req && (req as any).headers
      const getHeader = (name: string) => {
        if (!headers) return undefined
        if (typeof headers.get === 'function') return headers.get(name)
        return headers[name.toLowerCase()] || headers[name]
      }
      const id = getHeader('x-request-id') || crypto.randomUUID()
      const rawUrl = (req as any)?.url || 'http://local/unknown'
      let pathname = '/unknown'
      try {
        pathname = new URL(rawUrl).pathname
      } catch {
        // ignore URL parse errors; keep fallback pathname
      }
      const method = (req as any)?.method || 'GET'
      return logger.child({ requestId: id, path: pathname, method, privacy: privacyLevel() })
    } catch {
      // Absolute fallback – should be rare
      return logger
    }
  }

export function logEvent(base: pino.Logger, event: string, fields: Record<string, unknown> = {}) {
  const { cleaned, redactions } = scrubObject(fields)
  base.info({ event, ...cleaned, redactions: redactions.length ? redactions : undefined })
}

export function logError(base: pino.Logger, event: string, err: unknown, fields: Record<string, unknown> = {}) {
  const e = err as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const minimal = { name: e?.name, message: e?.message }
  const hash = typeof e?.stack === 'string' ? crypto.createHash('sha1').update(e.stack).digest('hex').slice(0,8) : undefined
  const { cleaned, redactions } = scrubObject(fields)
  base.error({ event, error: minimal, stackHash: hash, ...cleaned, redactions: redactions.length ? redactions : undefined })
}
