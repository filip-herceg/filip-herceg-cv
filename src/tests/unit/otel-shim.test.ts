import { describe, it, expect, vi } from 'vitest'

describe('otel.ts shim expiration branch', () => {
  it('emits console.warn after expiration date in non-production', async () => {
    vi.useFakeTimers()
    // Advance clock beyond 2025-10-01
    vi.setSystemTime(new Date('2025-10-02T00:00:00Z'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await import('@/lib/otel')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
    vi.useRealTimers()
  })
})
