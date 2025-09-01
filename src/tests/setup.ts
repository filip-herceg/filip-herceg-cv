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
