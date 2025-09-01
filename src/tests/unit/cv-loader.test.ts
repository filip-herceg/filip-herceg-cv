import { describe, it, expect, vi } from 'vitest'

// Force memory backend for deterministic behavior
process.env.CV_STORAGE = 'memory'

vi.mock('@/lib/cv/storage', async (orig) => {
  const actual = await (orig as any)() // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    ...actual,
    createStorage: () => actual.createStorage(),
  }
})

describe('cv loader ensure logic', () => {
  it('returns data and design and seeds when empty', async () => {
    const { getCvData, getCvDesign } = await import('@/lib/cv/loader')
    const data = await getCvData('en')
    const design = await getCvDesign('en')
    expect(data.person.name.length).toBeGreaterThan(0)
    expect(design.page.size).toBe('A4')
  })
})
