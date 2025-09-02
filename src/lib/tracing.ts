// Tracing scaffold (S07 -> Phase 2): minimal span helper behind ENABLE_TRACING flag.
// Phase 1: console.debug markers. Phase 2 (this revision): structured logger events with traceId & duration.
import crypto from 'node:crypto'
import { logger } from './logger'
import { trace, context } from '@opentelemetry/api'

type AttrVal = string | number | boolean
interface Span { end(extraAttributes?: Record<string, AttrVal>): void; setAttribute(k: string, v: AttrVal): void; traceId?: string }
class NoopSpan implements Span { traceId = undefined; end() { return; }; setAttribute(_k: string, _v: AttrVal) { /* noop */ } }

export function startSpan(name: string, initial?: Record<string, AttrVal>): Span {
  // Evaluate flag at call time so tests can toggle env between cases
  const enabled = process.env.ENABLE_TRACING === '1'
  if (!enabled) return new NoopSpan()
  // If OTEL is initialized, create a real OTEL span so future phases can export it.
  let otelSpan: import('@opentelemetry/api').Span | undefined
  try {
    // Cheap check: only create if exporter env is present (initOpenTelemetry will also require this)
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      otelSpan = trace.getTracer('filip-herceg-cv').startSpan(name, undefined, context.active())
    }
  } catch { /* ignore span creation errors */ }
  const traceId = otelSpan ? otelSpan.spanContext().traceId : crypto.randomUUID()
  const started = Date.now()
  const attrs: Record<string, AttrVal> = { 'span.name': name, ...initial }
  // Backward-compatible console markers
  // eslint-disable-next-line no-console
  console.debug('[trace:start]', { 'span.name': name, ...initial })
  logger.info({ event: 'trace:start', traceId, span: name, ...initial })
  return {
    traceId,
    end(extra?: Record<string, AttrVal>) {
      const durationMs = Date.now() - started
      if (extra) Object.assign(attrs, extra)
      // eslint-disable-next-line no-console
      console.debug('[trace:end]', { 'span.name': name })
      logger.info({ event: 'trace:end', traceId, span: name, durationMs, ...extra })
      if (otelSpan) {
        if (extra) {
          for (const [k, v] of Object.entries(extra)) {
            try { otelSpan.setAttribute(k, v) } catch { /* ignore */ }
          }
        }
        otelSpan.end()
      }
    },
    setAttribute(k: string, v: AttrVal) {
      attrs[k] = v
      if (otelSpan) { try { otelSpan.setAttribute(k, v) } catch { /* ignore */ } }
    },
  }
}

// Helper to start a span conditionally and immediately end it around a synchronous function
export function withSpan<T>(name: string, fn: () => T, initial?: Record<string, AttrVal>): T {
  const span = startSpan(name, initial)
  try {
    const result = fn()
    span.end()
    return result
  } catch (err) {
    span.setAttribute('error', true)
    if (typeof err === 'object' && err && 'message' in err) {
      const raw = (err as { message?: unknown }).message
      const msg = typeof raw === 'string' ? raw : 'error'
      span.setAttribute('error.message', msg)
    }
    span.end({ error: true })
    throw err
  }
}
