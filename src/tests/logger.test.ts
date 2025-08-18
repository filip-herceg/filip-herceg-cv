import { describe, it, expect } from 'vitest'
import { logger, withRequest } from '@/lib/logger'

// Minimal shape for pino child used in test
interface PinoChild {
  bindings(): Record<string, unknown>
}

describe('logger', () => {
  it('creates child logger with fields', () => {
    const child = withRequest({ requestId: 'abc' })
    const bindings = (child as unknown as PinoChild).bindings()
    expect(bindings.requestId).toBe('abc')
  })
  it('logs at info level by default', () => {
    expect(logger.level).toBe('info')
  })
})
