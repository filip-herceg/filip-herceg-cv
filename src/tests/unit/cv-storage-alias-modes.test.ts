import { describe, it, expect, vi } from 'vitest'

// Targets alias switch cases in createStorage(): 'in-memory' and 'database'

vi.mock('@/lib/metrics', () => ({
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} }
}))

// Service mocked to return empty so we do minimal work
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({ data: { person: { name: 'X', title: 'Y', profile: '', contact: { email: 'x@y.z' }, links: [] }, skills: [], projects: [] }, design: { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#000', background: '#fff', surface: '#fff', text: '#000', mutedText: '#222' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] }, source: 'db' })
}))

describe('cv-storage alias modes', () => {
  it('in-memory alias maps to MemoryBackend', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'in-memory'
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    const res = await store.get('en')
    expect(res.source).toBe('memory')
  })

  it('database alias maps to DatabaseBackend', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'database'
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    const res = await store.get('en')
    expect(res.source === 'db' || res.source === 'empty').toBe(true)
  })
})
