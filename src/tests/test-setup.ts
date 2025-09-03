/* eslint-disable */
import '@testing-library/jest-dom'
// Ensure React is globally available for files compiled with classic JSX runtime in tests
// (Some server components / preserved JSX may reference React at runtime even with ESM import.)
import React from 'react'
import { vi } from 'vitest'
// Provide global React reference for legacy JSX in some tested modules.
// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
;(globalThis as any).React = React

// Default env tweaks for tests (can be overridden inside individual test files):
//  - Force memory storage to avoid incidental Prisma initialization when not explicitly under test
//  - Disable auto seed to keep deterministic sample data usage (tests that need DB seed handle it)
process.env.CV_STORAGE = process.env.CV_STORAGE || 'memory'
process.env.CV_AUTO_SEED = process.env.CV_AUTO_SEED || 'false'

// Preload sample CV data/design BEFORE any test accesses the proxy exports (avoids race throwing
// 'sampleCvData not loaded yet'). We intentionally await inside a queued microtask so that Vitest's
// environment is fully ready while still resolving prior to first test execution.
// Provide a lightweight metrics mock early (before sample-data import) so cv/storage/service paths
// referencing histogram/timers don't throw when metrics module is mocked selectively elsewhere.
// (File touched to ensure lint line mapping refresh; no CommonJS require remains.)
// eslint-disable-next-line @typescript-eslint/no-require-imports -- no actual require used; suppress phantom report
vi.mock('@/lib/metrics', () => {
  const NOOP = () => {}
  const makeCounter = () => ({ inc: NOOP, dec: NOOP, set: NOOP, labels: () => makeCounter() })
  const makeGauge = () => ({ set: NOOP, inc: NOOP, dec: NOOP, labels: () => makeGauge() })
  const makeHistogram = () => ({ startTimer: () => NOOP, observe: NOOP, labels: () => makeHistogram() })
  const counterState: Record<string, number> = {}
  const record = (name: string, inc: number) => { counterState[name] = (counterState[name] || 0) + inc }
  const makeNamedCounter = (name: string) => ({ inc: (labels?: any) => { record(name, 1); return labels }, dec: NOOP, set: NOOP, labels: () => makeNamedCounter(name) })
  const base = {
    // CV related
    cvAggregateLoadsTotal: makeNamedCounter('cv_aggregate_loads_total'),
    cvStorageGetDurationSeconds: makeHistogram(),
    cvStorageBackend: { labels: () => ({ set: NOOP }) },
    cvCacheHitsTotal: makeNamedCounter('cv_cache_hits_total'),
    cvCacheMissesTotal: makeNamedCounter('cv_cache_misses_total'),
    // Auth
    authLoginAttemptsTotal: makeNamedCounter('auth_login_attempts_total'),
    authActiveSessions: makeGauge(),
  authRateLimiterBackend: { labels: () => ({ set: NOOP }) },
  authLoginBackoffMs: makeGauge(),
    authRateLimitFailuresTotal: makeNamedCounter('auth_rate_limit_failures_total'),
    // PDF
    pdfRequestsTotal: makeNamedCounter('pdf_requests_total'),
  pdfCacheEntries: makeGauge(),
  pdfCacheGetDurationSeconds: makeHistogram(),
    pdfCacheHitsTotal: makeNamedCounter('pdf_cache_hits_total'),
    pdfCacheMissesTotal: makeNamedCounter('pdf_cache_misses_total'),
  pdfGenerationDurationSeconds: makeHistogram(),
    // Permalinks
    permalinkCreatesTotal: makeNamedCounter('permalink_creates_total'),
  // Admin mutations
    cvEntityMutationsTotal: makeNamedCounter('cv_entity_mutations_total'),
  // Render helper
    renderMetrics: async () => Object.entries(counterState).map(([k,v]) => `# HELP ${k} mock\n# TYPE ${k} counter\n${k}{app="filip-herceg-cv"} ${v}`).join('\n') + '\n',
  }
  // Fallback proxy so any new metric name returns a benign counter-like object
  return new Proxy(base, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop]
      return makeCounter()
    }
  })
})
// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
  try {
    const mod = await import('@/lib/cv/sample-data')
    await Promise.all([mod.sampleCvDataPromise, mod.sampleCvDesignPromise])
  } catch (e) {
    // Log at debug level; tests referencing sample data will fail loudly if this truly breaks.
    // eslint-disable-next-line no-console
    console.debug('sample data preload failed (non-fatal for tests):', (e as Error)?.message)
  }
})()

// Polyfill IntersectionObserver for framer-motion viewport features
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  // minimal noop polyfill
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).IntersectionObserver = class {
    observe = () => {}
    unobserve = () => {}
    disconnect = () => {}
    takeRecords = () => []
  }
}

// Polyfill ResizeObserver used by Radix NavigationMenu (jsdom lacks implementation)
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).ResizeObserver = class {
    observe = () => {}
    unobserve = () => {}
    disconnect = () => {}
  }
}

// Mock next/link to avoid ref & nesting warnings.
// Behaviour:
//  - If legacyBehavior/passHref is used and a single React element child is provided, clone it with href (do not wrap).
//  - If the child is an <a>, clone it (adds href) – avoids nested anchors.
//  - Otherwise render a plain <a> wrapper.
vi.mock('next/link', () => ({
  __esModule: true,
  default: React.forwardRef(function LinkMock(rawProps: any, ref: any) {
    const { href, children } = rawProps
    const finalHref = typeof href === 'string' ? href : '#'
    const cleaned: Record<string, unknown> = {}
    for (const k of Object.keys(rawProps)) {
      if (
        [
          'href',
          'children',
          'legacyBehavior',
          'passHref',
          'prefetch',
          'onMouseEnter',
          'asChild', // ignore Radix asChild composition markers
        ].includes(k)
      )
        continue
      cleaned[k] = rawProps[k]
    }
    if (React.isValidElement(children)) {
      // Detect if parent wrapper will set asChild (Radix) by presence of data-slot attr on child
      const childIsAnchor = (children as any).type === 'a'
      if (childIsAnchor) {
        return React.cloneElement(children as any, { href: finalHref, ref, ...cleaned })
      }
      return React.cloneElement(children as any, { href: finalHref, ref, role: 'link', ...cleaned })
    }
    return React.createElement('a', { href: finalHref, ref, ...cleaned }, children)
  }),
}))

// Mock next/navigation for components using router hooks outside real app router context
// Central router mock so individual tests can assert calls (e.g. ShortModeContainer URL sync)
const mockRouter = { replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }
vi.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => mockRouter,
  // helper getter for tests (import { getMockRouter } from 'next/navigation')
  getMockRouter: () => mockRouter,
  usePathname: () => '/cv',
  useSearchParams: () => ({ get: () => null }),
}))

// Export the mockRouter for potential direct import (rarely needed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__mockRouter = mockRouter
