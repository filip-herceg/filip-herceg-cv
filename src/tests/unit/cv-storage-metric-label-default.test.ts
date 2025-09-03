import { describe, it, expect, vi } from 'vitest'

// Covers createStorage() metric label invocation when CV_STORAGE unset (default path) lines 266-272.

const labelsFn = vi.fn(() => ({ set: vi.fn() }))

vi.mock('@/lib/metrics', () => ({
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: labelsFn },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} }
}))

// Mock service to avoid hitting prisma.
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({
    data: { person: { name: 'Z', title: 'T', profile: '', contact: { email: 'z@y.z' }, links: [] }, skills: [], projects: [] },
    design: { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#000', background: '#fff', surface: '#fff', text: '#000', mutedText: '#111' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] },
    source: 'db'
  })
}))

describe('cv storage metric label default mode', () => {
  it('invokes cvStorageBackend.labels with db when CV_STORAGE unset', async () => {
    vi.resetModules()
    delete process.env.CV_STORAGE
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    await store.get('en')
  expect(labelsFn).toHaveBeenCalled()
  // Cast to any to bypass Vitest's variadic tuple inference edge in TS
  const firstCall: any = (labelsFn as any).mock.calls[0]
  const firstArg = firstCall?.[0]
  expect(firstArg).toBe('db')
  })
})
