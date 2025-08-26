import { describe, it, expect } from 'vitest'
import { middleware } from '@/middleware'

function makeReq(path: string) {
  return new Request('https://example.test' + path)
}

describe('middleware', () => {
  it('sets security + CSP headers and nonce', () => {
    const res = middleware(makeReq('/'))
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    const csp = res.headers.get('Content-Security-Policy')
    expect(csp).toMatch(/script-src 'self' 'nonce-/)
    const nonce = res.headers.get('x-csp-nonce')
    expect(nonce).toBeTruthy()
    expect(csp).toContain(`nonce-${nonce}`)
  })
  it('skips static asset paths', () => {
    const res = middleware(makeReq('/_next/static/chunk.js'))
    // No CSP header set
    expect(res.headers.get('Content-Security-Policy')).toBeNull()
  })
})
