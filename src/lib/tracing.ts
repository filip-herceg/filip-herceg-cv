// Tracing scaffold (S07 -> Phase 2): minimal span helper behind ENABLE_TRACING flag.
// Phase 1: console.debug markers. Phase 2 (this revision): structured logger events with traceId & duration.
import crypto from 'node:crypto'
import { logger } from './logger'

interface Span { end(extraAttributes?: Record<string, unknown>): void; setAttribute(k: string, v: unknown): void; traceId?: string }
class NoopSpan implements Span { traceId = undefined; end() { return; }; setAttribute(_k: string, _v: unknown) { /* noop */ } }

export function startSpan(name: string, initial?: Record<string, unknown>): Span {
  // Evaluate flag at call time so tests can toggle env between cases
  const enabled = process.env.ENABLE_TRACING === '1'
  if (!enabled) return new NoopSpan()
  const traceId = crypto.randomUUID()
  const started = Date.now()
  const attrs: Record<string, unknown> = { 'span.name': name, ...initial }
  // Backward-compatible console markers
  // eslint-disable-next-line no-console
  console.debug('[trace:start]', { 'span.name': name, ...initial })
  logger.info({ event: 'trace:start', traceId, span: name, ...initial })
  return {
    traceId,
    end(extra?: Record<string, unknown>) {
      const durationMs = Date.now() - started
      if (extra) Object.assign(attrs, extra)
      // eslint-disable-next-line no-console
      console.debug('[trace:end]', { 'span.name': name })
      logger.info({ event: 'trace:end', traceId, span: name, durationMs, ...extra })
    },
    setAttribute(k: string, v: unknown) {
      attrs[k] = v
    },
  }
}

// Helper to start a span conditionally and immediately end it around a synchronous function
export function withSpan<T>(name: string, fn: () => T, initial?: Record<string, unknown>): T {
  const span = startSpan(name, initial)
  try {
    const result = fn()
    span.end()
    return result
  } catch (err) {
    span.setAttribute('error', true)
    span.end({ error: true })
    throw err
  }
}
