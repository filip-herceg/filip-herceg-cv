/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from 'vitest'

process.env.CV_STORAGE = 'redis'
vi.mock('ioredis', () => { throw new Error('ioredis load failure') })

describe('cv storage redis disabled fallback', () => {
  it('returns static sample data when redis backend fails to init', async () => {
    const { getCvData } = await import('@/lib/cv/loader')
    const data = await getCvData('en')
    expect(data.person.name).toBeTruthy()
  })
})
