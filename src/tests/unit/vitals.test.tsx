import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import Vitals from '@/components/layout/vitals'

// mock web-vitals attribution functions to invoke callbacks immediately
vi.mock('web-vitals/attribution', () => ({
  onCLS: (cb: (m: any) => void) => cb({ name: 'CLS', value: 0.01 }),
  onINP: (cb: (m: any) => void) => cb({ name: 'INP', value: 120 }),
  onLCP: (cb: (m: any) => void) => cb({ name: 'LCP', value: 1800 }),
}))

describe('Vitals', () => {
  let beacon: any
  let fetchSpy: any
  beforeEach(() => {
    beacon = vi.fn()
    fetchSpy = vi.fn()
    ;(global as any).navigator = { sendBeacon: beacon }
    ;(global as any).fetch = fetchSpy
  })

  it('sends metrics via sendBeacon when available', () => {
    render(<Vitals />)
    expect(beacon).toHaveBeenCalledTimes(3)
    const payloads = beacon.mock.calls.map((c: any) => JSON.parse(c[1]))
    expect(payloads.map((p: any) => p.name).sort()).toEqual(['CLS','INP','LCP'])
  })

  it('falls back to fetch when sendBeacon missing', () => {
    ;(global as any).navigator = {}
    render(<Vitals />)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })
})
