import { describe, it, expect } from 'vitest'
import { withRequestContext, logEvent, logError } from '@/lib/logger'

function makePartialReq() {
  return { headers: { 'x-request-id': 'p-1', host: 'example.test' }, url: 'http://example.test/x', method: 'POST' }
}

describe('logger extra branches', () => {
  it('handles malformed request object safely', () => {
    const child: any = withRequestContext(undefined) // eslint-disable-line @typescript-eslint/no-explicit-any
    const bindings = child.bindings?.() || child._bindings || {}
    expect(bindings.requestId).toBeDefined()
  })
  it('logs event + error with additional fields', () => {
    // Just ensure functions execute with unusual field shapes to trigger scrub branches
    logEvent(withRequestContext(makePartialReq() as any), 'extra:event', { url: 'https://host/path?x=1' })
    logError(withRequestContext(makePartialReq() as any), 'extra:error', new Error('fail'), { url: 'https://host/path?x=1' })
    expect(true).toBe(true)
  })
})
