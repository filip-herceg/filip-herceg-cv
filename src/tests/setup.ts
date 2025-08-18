import '@testing-library/jest-dom'

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
