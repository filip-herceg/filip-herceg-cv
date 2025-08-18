import { describe, it, expect, beforeEach } from 'vitest'
import { record, stats, clear } from '@/lib/rum'

describe('RUM aggregator', () => {
  beforeEach(() => clear())

  it('aggregates percentiles', () => {
    // push 1..100
    for (let i = 1; i <= 100; i++) record({ name: 'LCP', value: i })
    const s = stats()
    expect(s.lcp.count).toBe(100)
    expect(Math.round(s.lcp.p50)).toBe(50)
    expect(Math.round(s.lcp.p90)).toBe(90)
    expect(Math.round(s.lcp.p99)).toBe(99)
  })
})
