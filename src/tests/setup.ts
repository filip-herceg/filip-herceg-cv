import '@testing-library/jest-dom'
// Ensure React is globally available for files compiled with classic JSX runtime in tests
// (Some server components / preserved JSX may reference React at runtime even with ESM import.)
import React from 'react'
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
