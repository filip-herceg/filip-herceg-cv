import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Simulate environment where no chromium binary is available
vi.mock('fs', () => {
  const existsSync = () => false
  return { __esModule: true, default: { existsSync }, existsSync }
})

describe('chromium pool disabled path', () => {
  const prevEnv = process.env.CHROMIUM_PATH

  beforeEach(() => {
    delete process.env.CHROMIUM_PATH
    vi.resetModules()
  })

  afterEach(async () => {
    process.env.CHROMIUM_PATH = prevEnv
    // Ensure pool is torn down cleanly in case future tests import it
    const mod = await import('@/lib/pdf/chromium-pool')
    await mod.shutdownChromiumPool()
  })

  it('returns null from acquirePooledPage when chromium is unavailable', async () => {
    const mod = await import('@/lib/pdf/chromium-pool')
    await mod.warmChromiumPool()
    const acquired = await mod.acquirePooledPage()
    expect(acquired).toBeNull()
    await mod.shutdownChromiumPool()
  })
})
