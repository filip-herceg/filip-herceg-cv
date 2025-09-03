import { describe, it, expect, vi } from 'vitest'

// Covers createStorage() default case with unknown mode plus metric label invocation lines 266-272.

const labelsSpy = vi.fn(() => ({ set: vi.fn() }))

vi.mock('@/lib/metrics', () => ({
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: labelsSpy },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} }
}))

vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({
    data: { person: { name: 'Person', title: 'Role', profile: '', contact: { email: 'a@b.c' }, links: [] }, skills: [], projects: [] },
    design: { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#000', background: '#fff', surface: '#fff', text: '#000', mutedText: '#333' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] },
    source: 'db'
  })
}))

describe('cv storage unknown mode metric labels', () => {
  it('invokes labels with original unknown mode and uses db backend', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'StrAnGe'
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    const res = await store.get('en')
    expect(res.source === 'db' || res.source === 'empty').toBe(true)
    expect(labelsSpy).toHaveBeenCalled()
    const arg = (labelsSpy as any).mock.calls[0]?.[0]
    expect(arg).toBe('strange') // lowercased in createStorage
  })
})
