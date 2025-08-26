import '@testing-library/jest-dom'
// Ensure React is globally available for files compiled with classic JSX runtime in tests
// (Some server components / preserved JSX may reference React at runtime even with ESM import.)
import React from 'react'
import { vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).React = React

// Polyfill IntersectionObserver for framer-motion viewport features
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  // minimal noop polyfill
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
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
    // Strip Next.js specific props that cause DOM warnings
    const cleaned: Record<string, unknown> = {}
    for (const k of Object.keys(rawProps)) {
      if (['href', 'children', 'legacyBehavior', 'passHref', 'prefetch', 'onMouseEnter'].includes(k)) continue
      cleaned[k] = rawProps[k]
    }
    if (React.isValidElement(children)) {
      // If child already anchor, merge props without creating nesting
      if ((children as any).type === 'a') {
        return React.cloneElement(children as any, { href: finalHref, ref, ...cleaned })
      }
      return React.cloneElement(children as any, { href: finalHref, ref, role: 'link', ...cleaned })
    }
    return React.createElement('a', { href: finalHref, ref, ...cleaned }, children)
  }),
}))

// Mock next/navigation for components using router hooks outside real app router context
vi.mock('next/navigation', () => {
  return {
    __esModule: true,
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/cv',
    useSearchParams: () => ({ get: () => null }),
  }
})
