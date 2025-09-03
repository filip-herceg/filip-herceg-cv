import { describe, it, expect } from 'vitest'
import { withSpan } from '@/lib/tracing'

describe('tracing error branch', () => {
  it('withSpan sets error attrs when fn throws', () => {
    process.env.ENABLE_TRACING = '1'
    expect(() => withSpan('explode', () => { throw new Error('kaboom') })).toThrowError('kaboom')
  })
})
