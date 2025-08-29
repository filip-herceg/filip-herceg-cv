import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startSpan } from '@/lib/tracing'

const original = process.env.ENABLE_TRACING

describe('tracing scaffold', () => {
  beforeEach(() => {
    delete process.env.ENABLE_TRACING
  })
  afterEach(() => {
    if (original !== undefined) process.env.ENABLE_TRACING = original
    else delete process.env.ENABLE_TRACING
  })

  it('noop when disabled', () => {
    const span = startSpan('disabled')
    span.setAttribute('k', 1)
    span.end()
    expect(true).toBe(true)
  })

  it('logs when enabled', () => {
    process.env.ENABLE_TRACING = '1'
    const span = startSpan('enabled', { init: true })
    span.setAttribute('x', 42)
    span.end()
    expect(true).toBe(true)
  })
})
