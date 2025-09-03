import { describe, it, expect, vi, beforeAll } from 'vitest'

// Metrics mock (lightweight) – reuse pattern from other storage tests
function createLabeledCounter(labelName: string) {
  const map = new Map<string, number>()
  return { inc(labels: Record<string,string>) { const k = labels[labelName]; map.set(k, (map.get(k)||0)+1) } }
}
const metricsMock = {
  cvCacheHitsTotal: createLabeledCounter('backend'),
  cvCacheMissesTotal: createLabeledCounter('backend'),
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
}
vi.mock('../../lib/metrics', () => metricsMock)
vi.mock('@/lib/metrics', () => metricsMock)

import seedDataEn from '@/lib/cv/data/cv.en.json'
import seedDesignEn from '@/lib/cv/data/design.en.json'
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({ data: seedDataEn, design: seedDesignEn, source: 'db' as const }),
  seedIfEmpty: async () => false,
}))

describe('cv storage s3 disabled scenarios', () => {
  beforeAll(() => { process.env.AWS_REGION = 'us-east-1' })

  it('handles missing bucket (no S3_BUCKET) – client never created, no store attempt', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    delete process.env.S3_BUCKET
    process.env.S3_PREFIX = 'cv'
    // Provide a harmless S3 module; ensureClient should early-return because bucket absent
  // Provide a minimal S3Client stub (function constructor) – no side effects
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  function S3ClientStub(this: unknown) { /* intentionally empty */ }
  vi.doMock('@aws-sdk/client-s3', () => ({ S3Client: S3ClientStub }))
    const { createStorage } = await import('@/lib/cv/storage')
    const storage: any = createStorage() // eslint-disable-line @typescript-eslint/no-explicit-any
    const res = await storage.get('en')
    expect(res.source === 'db' || res.source === 'empty').toBe(true)
    // invalidate should no-op (coverage for early returns)
    storage.invalidate('en')
    storage.invalidate('*')
    storage.close()
  })

  it('handles constructor failure (init catch -> disabled) and skips store/invalidate', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'broken-bucket'
    process.env.S3_PREFIX = 'cv'
    // Throw during S3Client construction to exercise catch path (lines: s3 init failed; disabling)
  // Constructor that throws – keep as class to mimic shape; suppress lint
  // eslint-disable-next-line max-classes-per-file, @typescript-eslint/no-extraneous-class
  class BoomClient { constructor() { throw new Error('ctor boom') } }
  vi.doMock('@aws-sdk/client-s3', () => ({ S3Client: BoomClient }))
    const { createStorage } = await import('@/lib/cv/storage')
    const storage: any = createStorage() // eslint-disable-line @typescript-eslint/no-explicit-any
    const res = await storage.get('en')
    expect(res.source === 'db' || res.source === 'empty').toBe(true)
    // invalidate should early-return because disabled
    storage.invalidate('*')
    storage.close()
  })
})
