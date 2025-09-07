import { describe, it, expect, beforeEach, vi } from 'vitest'

// Lightweight in-test metric mock (prom-client free) ensures we can deterministically assert increments
// We mock BEFORE importing storage/metrics modules.
function createLabeledCounter(labelName: string) {
  const map = new Map<string, number>()
  return {
    inc(labels: Record<string,string>) { const key = labels[labelName]; map.set(key, (map.get(key) || 0) + 1) },
    get() { return { values: Array.from(map.entries()).map(([k,v]) => ({ labels: { [labelName]: k }, value: v })) } },
  }
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

// Helper to pull counter child value for backend label
function getCounterValue(counter: any, backend: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const data = counter.get()
    const match = data.values?.find((v: any) => v.labels?.backend === backend) // eslint-disable-line @typescript-eslint/no-explicit-any
    return match?.value ?? 0
  } catch { return 0 }
}

describe('CvStorageBackend memory', () => {
  beforeEach(async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'memory'
  })

  it('records miss then hit for memory backend', async () => {
    const { createStorage } = await import('../../lib/cv/storage')
    const { cvCacheHitsTotal, cvCacheMissesTotal } = await import('../../lib/metrics')
    const backend = createStorage()
    const missBefore = getCounterValue(cvCacheMissesTotal, 'memory')
    const hitBefore = getCounterValue(cvCacheHitsTotal, 'memory')
    await backend.get('en')
    const missAfterFirst = getCounterValue(cvCacheMissesTotal, 'memory')
  expect(missAfterFirst).toBeGreaterThanOrEqual(missBefore + 1)
    await backend.get('en')
    const hitAfterSecond = getCounterValue(cvCacheHitsTotal, 'memory')
  expect(hitAfterSecond).toBeGreaterThanOrEqual(hitBefore + 1)
  })
})

describe('CvStorageBackend redis (mocked)', () => {
  beforeEach(async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'redis'
  process.env.REDIS_URL = 'redis://unit-test'
    process.env.CV_REDIS_TTL = '60'
    // Mock service aggregate so DB fetch returns consistent data
    vi.doMock('../../lib/cv/service', () => {
      // Provide data & design matching CvDataSchema / CvDesignSchema so cache hits validate
      const data = {
        person: { name: 'Tester', title: 'Dev', profile: 'Profile', contact: { email: 't@example.com' }, links: [] },
        skills: [],
        projects: []
      }
      const design = { page: { size: 'A4', margin: '20', columns: 2, gutter: '16' }, palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#fff', text: '#000', mutedText: '#444' }, typography: { body: 'system-ui', heading: 'system-ui', scale: 1 }, shapes: [], sections: [] }
      return {
        getAggregate: async () => ({ data, design, source: 'db' as const }),
        seedIfEmpty: async () => false
      }
    })
    // Mock ioredis with simple Map-backed client
    vi.doMock('ioredis', () => {
      class MockRedis {
        store = new Map<string, string>()
        on() { return this }
        async connect() { return }
        async get(key: string) { return this.store.get(key) ?? null }
        async set(key: string, val: string) { this.store.set(key, val); return 'OK' }
        async del(keys: string | string[]) {
          const arr = Array.isArray(keys) ? keys : [keys]
            let c = 0
          for (const k of arr) { if (this.store.delete(k)) c++ }
          return c
        }
        async keys(pattern: string) {
          if (pattern !== 'cv:*:v1') return []
          const keys = [...this.store.keys()]
          const result: string[] = []
          for (const k of keys) {
            if (k.startsWith('cv:') && k.endsWith(':v1')) result.push(k)
          }
          return result
        }
        async scan(cursor: string, _match: string, pattern: string) {
          if (cursor !== '0') return ['0', []]
          const ks = await this.keys(pattern)
          return ['0', ks]
        }
      }
      return { default: MockRedis }
    })
  })

  it('records redis miss then hit', async () => {
    const { createStorage } = await import('../../lib/cv/storage')
    const { cvCacheHitsTotal, cvCacheMissesTotal } = await import('../../lib/metrics')
    const backend = createStorage()
    const missBefore = getCounterValue(cvCacheMissesTotal, 'redis')
    const hitBefore = getCounterValue(cvCacheHitsTotal, 'redis')
    await backend.get('en')
    const missAfterFirst = getCounterValue(cvCacheMissesTotal, 'redis')
  expect(missAfterFirst).toBeGreaterThanOrEqual(missBefore + 1)
    await backend.get('en')
    const hitAfterSecond = getCounterValue(cvCacheHitsTotal, 'redis')
  expect(hitAfterSecond).toBeGreaterThanOrEqual(hitBefore + 1)
  })
})
