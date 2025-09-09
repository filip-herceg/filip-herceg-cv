import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Covers uncovered lines in loader.ensure(): seedIfEmpty branch & second get population.
// Strategy: mock storage factory so first get returns empty, seedIfEmpty is invoked, second get returns seeded data.

describe('cv loader seeding branch', () => {
  beforeEach(() => {
    // New behavior: auto-seed is opt-in. Enable it explicitly and provide a valid-looking DATABASE_URL
    // so loader.shouldAutoSeed() returns true without actually touching a real DB (storage is mocked below).
    ;(process as any).env.CV_AUTO_SEED = 'true'
    ;(process as any).env.DATABASE_URL = 'postgresql://test:test@localhost:5432/db'
    vi.resetModules()
  })

  afterEach(() => {
    delete (process as any).env.CV_AUTO_SEED
    delete (process as any).env.DATABASE_URL
  })

  it('invokes seedIfEmpty then caches seeded data/design', async () => {
    const seedIfEmpty = vi.fn().mockResolvedValue(true)
    let call = 0
    const seededData = { person: { name: 'Seeded', title: 'T', profile: 'P', contact: { email: 'x@y.z' }, links: [] }, skills: [], projects: [] }
    const seededDesign = { page: { size: 'A4', margin: 10, columns: 1, gutter: 4 }, palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#333' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] }
    const backendGet = async () => {
      call++
      if (call === 1) return { data: {} as any, design: {} as any, source: 'empty' as const }
      return { data: seededData, design: seededDesign, source: 'db' as const }
    }
    vi.doMock('@/lib/cv/storage', () => ({
      createStorage: () => ({ get: backendGet, seedIfEmpty }),
      defaultSeedData: seededData,
      defaultSeedDesign: seededDesign,
    }))

    const { getCvData, getCvDesign } = await import('@/lib/cv/loader')
    const data = await getCvData('en')
    const design = await getCvDesign('en')

    expect(seedIfEmpty).toHaveBeenCalledTimes(1)
    expect(data.person.name).toBe('Seeded')
    expect(design.page.size).toBe('A4')
    // Subsequent calls should NOT trigger additional get/seed cycles (cached)
    const again = await getCvData('en')
    expect(again.person.name).toBe('Seeded')
    expect(call).toBe(2) // only two backend.get calls (pre & post seed)
  })
})
