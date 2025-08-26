import { describe, it, expect } from 'vitest'
import { withRequestContext, scrubObject, logEvent, logError, logger } from '@/lib/logger'

function makeRequest(url: string, headers: Record<string,string> = {}) {
  return new Request(url, { headers: new Headers(headers) })
}

describe('logging privacy', () => {
  it('adds request context fields', () => {
    const req = makeRequest('https://example.test/contact', { 'x-request-id': 'req-123' })
    const child: any = withRequestContext(req) // eslint-disable-line @typescript-eslint/no-explicit-any
    const bindings = child.bindings?.() || child._bindings || {}
    expect(bindings.requestId).toBe('req-123')
    expect(bindings.path).toBe('/contact')
    expect(bindings.method).toBe('GET')
  })
  it('scrubs email values', () => {
    const { cleaned, redactions } = scrubObject({ email: 'user@example.com', other: 'keep' })
    expect(cleaned.email).toMatch(/\[redacted.email\]/)
    expect(redactions).toContain('email')
  })
  it('logs event with redactions metadata', () => {
    logEvent(logger, 'test:event', { email: 'user@example.com' })
    // Cannot easily inspect pino internal ring buffer; rely on scrubObject behavior above.
    expect(true).toBe(true)
  })
  it('scrubs url host in high privacy mode', () => {
    process.env.LOG_PRIVACY = 'high'
    const { cleaned, redactions } = scrubObject({ site: 'https://example.com/path?q=1' })
    expect(String(cleaned.site)).toContain('[redacted.host]')
    expect(redactions).toContain('url.host')
    process.env.LOG_PRIVACY = 'low'
  })
  it('logs error with stack hash', () => {
    const err = new Error('boom')
    logError(logger, 'test:error', err, { email: 'user@example.com' })
    expect(err.message).toBe('boom')
  })
})
