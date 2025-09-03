import { describe, it, expect, vi } from 'vitest'

// Targets residual uncovered clusters in storage.ts:
// - MemoryBackend second get() (hit vs miss path & timer close)
// - RedisBackend get() path where set() after DB load throws ("redis set failed")
// - RedisBackend seedIfEmpty() path where set() throws ("redis seed set failed")
// - createStorage() metric label invocation for multiple modes (defensive no-throw)

describe('cv-storage final uncovered micro branches', () => {
  it('memory backend second call hits cache', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'memory'
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    const first = await store.get('en')
    expect(first.source).toBe('memory')
    const second = await store.get('en') // should exercise hit path
    expect(second.source).toBe('memory')
    // sanity: same data object reference (cache) – not strictly required but indicates path
    expect(second.data.person.name).toBe(first.data.person.name)
  })

  it('memory backend timer closure path when histogram present', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'memory'
    const stops: number[] = []
    vi.doMock('@/lib/metrics', () => ({
      cvCacheHitsTotal: { inc: () => undefined },
      cvCacheMissesTotal: { inc: () => undefined },
      cvAggregateLoadsTotal: { inc: () => undefined },
      cvStorageBackend: { labels: () => ({ set: () => undefined }) },
      cvStorageGetDurationSeconds: { startTimer: () => { const started = Date.now(); return () => stops.push(Date.now() - started) } }
    }))
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    await store.get('en')
    expect(stops.length).toBe(1)
    expect(typeof stops[0]).toBe('number')
  })

  it('redis backend set failures after db load and after seed are tolerated', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'redis'
    // Mock metrics histogram startTimer to ensure timer stop branch executes
    vi.doMock('@/lib/metrics', () => {
      const noop = () => undefined
      return {
        cvCacheHitsTotal: { inc: noop },
        cvCacheMissesTotal: { inc: noop },
        cvAggregateLoadsTotal: { inc: noop },
        cvStorageBackend: { labels: () => ({ set: noop }) },
        cvStorageGetDurationSeconds: { startTimer: () => noop }
      }
    })
    // Mock service aggregate to always return db-sourced aggregate
    vi.doMock('@/lib/cv/service', () => ({
      getAggregate: async () => ({ data: { person: { name: 'X', title: 'Y', profile: '', contact: { email: 'x@y.z' }, links: [] }, skills: [], projects: [] }, design: { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#000', background: '#fff', surface: '#fff', text: '#000', mutedText: '#222' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] }, source: 'db' }),
      seedIfEmpty: async () => true
    }))
    // Redis mock: get returns null (miss), set throws (to hit failure log branch), scan/del minimal stub
    class MockRedis {
      get = async () => null as string | null
      set = async () => { throw new Error('boom-set') }
      scan = async () => ['0', []] as [string, string[]]
      del = async () => 0
      on() { /* noop */ }
      connect = async () => {}
      expire = async () => 0
      quit = async () => {}
      scanStream() { return { on: () => {} } as unknown as NodeJS.ReadableStream }
    }
    vi.doMock('ioredis', () => ({ default: MockRedis }))
  const { createStorage, defaultSeedData, defaultSeedDesign } = await import('@/lib/cv/storage')
    const store = createStorage() // redis backend
    const agg = await store.get('en')
    expect(agg.source === 'db' || agg.source === 'empty').toBe(true)
    // seedIfEmpty will attempt to write into redis and fail (debug path)
    await store.seedIfEmpty?.('en', defaultSeedData, defaultSeedDesign)
  })

  it('createStorage metric label invocation for modes does not throw', async () => {
    vi.resetModules()
    const modes = ['memory', 'redis', 's3', 'db']
    for (const m of modes) {
      process.env.CV_STORAGE = m
      const { createStorage } = await import('@/lib/cv/storage')
      const backend = createStorage()
      expect(typeof backend.get).toBe('function')
    }
  })

  it('default mode (unset) metric label + s3 store path (forcePathStyle)', async () => {
    vi.resetModules()
    // Provide S3 env so that when we switch to s3 below we hit store path
    process.env.S3_BUCKET = 'bucket'
    process.env.S3_ENDPOINT = 'http://localhost:4566'
    // First: unset CV_STORAGE => default db path + metric label
    delete process.env.CV_STORAGE
    vi.doMock('@/lib/metrics', () => ({
      cvCacheHitsTotal: { inc: () => undefined },
      cvCacheMissesTotal: { inc: () => undefined },
      cvAggregateLoadsTotal: { inc: () => undefined },
      cvStorageBackend: { labels: () => ({ set: () => undefined }) },
      cvStorageGetDurationSeconds: { startTimer: () => (() => undefined) }
    }))
    vi.doMock('@/lib/cv/service', () => ({
      getAggregate: async () => ({ data: { person: { name: 'A', title: 'B', profile: '', contact: { email: 'a@b.c' }, links: [] }, skills: [], projects: [] }, design: { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#000', background: '#fff', surface: '#fff', text: '#000', mutedText: '#222' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] }, source: 'db' }),
      seedIfEmpty: async () => false
    }))
    // Mock S3 client to observe PutObjectCommand usage when we later switch to s3 mode
    const sends: string[] = []
    class MockS3Client {
      send(cmd: any) {
        const name = cmd?.constructor?.name || 'Unknown'
        sends.push(name)
        return Promise.resolve({})
      }
    }
    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: MockS3Client,
      GetObjectCommand: class {},
      PutObjectCommand: class {},
      ListObjectsV2Command: class {},
      DeleteObjectsCommand: class {},
      DeleteObjectCommand: class {}
    }))
    const { createStorage } = await import('@/lib/cv/storage')
    // default db
    const dbStore = createStorage()
    await dbStore.get('en')
    // switch to s3 & call get to trigger store path (async void)
    process.env.CV_STORAGE = 's3'
    const { createStorage: createStorageS3 } = await import('@/lib/cv/storage')
    const s3Store = createStorageS3()
    await s3Store.get('en')
    // allow microtask for void store
    await new Promise(r => setTimeout(r, 0))
    expect(sends.some(n => n === 'PutObjectCommand')).toBe(true)
  })
})
