// Tracing scaffold (S07): minimal span helper behind ENABLE_TRACING flag.
interface Span { end(): void; setAttribute(k: string, v: unknown): void }
class NoopSpan implements Span { end() { return; }; setAttribute(_k: string, _v: unknown) { /* noop */ } }

export function startSpan(name: string, initial?: Record<string, unknown>): Span {
  // Evaluate flag at call time so tests can toggle env between cases
  const enabled = process.env.ENABLE_TRACING === '1'
  if (!enabled) return new NoopSpan()
  const attrs: Record<string, unknown> = { 'span.name': name, ...initial }
  // eslint-disable-next-line no-console
  console.debug('[trace:start]', attrs)
  return {
    end() {
      // eslint-disable-next-line no-console
      console.debug('[trace:end]', { 'span.name': name })
    },
    setAttribute(k: string, v: unknown) {
      attrs[k] = v
    },
  }
}
