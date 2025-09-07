import { describe, it, expect, vi } from 'vitest'

// Covers error branches in sample-data.ts when sync getters called before underlying async promises resolve.
// We mock the loader module to introduce an artificial delay so the synchronous getters reliably throw.

describe('sample-data sync getters pre-resolution', () => {
  it('returns static fallback before resolution, then resolves to async values', async () => {
    vi.resetModules()
    const delayed = <T,>(val: T) => new Promise<T>(r => setTimeout(() => r(val), 25))
    const dataVal = { person: { name: 'Delayed', title: 'T', profile: 'P', contact: { email: 'x@y.z' }, links: [] }, skills: [], projects: [] }
    const designVal = { page: { size: 'A4', margin: 10, columns: 1, gutter: 4 }, palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#333' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] }
    vi.doMock('@/lib/cv/loader', () => ({
      getCvData: () => delayed(dataVal),
      getCvDesign: () => delayed(designVal)
    }))
  const mod = await import('@/lib/cv/sample-data')
  // Immediately accessing before the mocked promises resolve should not throw; returns fallback
  expect(() => mod.getSampleCvDataSync()).not.toThrow()
  const earlyName = mod.getSampleCvDataSync().person.name
  expect(typeof earlyName).toBe('string')
  expect(earlyName.length).toBeGreaterThan(0)
  // Await the original exported promises then synchronous getters should return the delayed value
  await mod.sampleCvDataPromise
  await mod.sampleCvDesignPromise
  expect(mod.getSampleCvDataSync().person.name).toBe('Delayed')
  })
})
