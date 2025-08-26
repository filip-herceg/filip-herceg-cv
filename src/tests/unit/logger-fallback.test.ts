import { describe, it, expect } from 'vitest'
import { withRequestContext, logError, logger } from '@/lib/logger'

describe('logger fallbacks', () => {
  it('falls back gracefully when header getter throws', () => {
    const badReq: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      headers: {
        get() { throw new Error('boom') },
      },
      url: '::::not-a-url',
      method: 'POST',
    }
    // Should not throw
    const child = withRequestContext(badReq)
    // We cannot easily introspect internal bindings, but ensure child has info method
    expect(typeof (child as any).info).toBe('function')
  })

  it('logError emits stack hash when stack present', () => {
    const err = new Error('test stack hash')
    // Monkey patch logger.error to capture payload
    const orig = (logger as any).error
    let captured: any
    ;(logger as any).error = (o: any) => { captured = o }
    try {
      logError(logger, 'test:error', err, { email: 'user@example.com' })
      expect(captured.event).toBe('test:error')
      expect(captured.error).toEqual({ name: 'Error', message: 'test stack hash' })
      expect(typeof captured.stackHash).toBe('string')
      // redactions should include email
      expect(captured.redactions).toContain('email')
    } finally {
      ;(logger as any).error = orig
    }
  })
})
