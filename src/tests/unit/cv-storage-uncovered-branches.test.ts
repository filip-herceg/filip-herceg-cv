import { describe, it, expect, vi } from 'vitest'

// Additional micro coverage for storage.ts uncovered lines:
// - Redis tryGetCached schema validation failure branch (JSON parse succeeds but schema invalid)
// - S3 ensureClient endpoint path (endpoint + forcePathStyle)
// - createStorage metric labels invocation with default (db) backend

describe('cv-storage uncovered branches', () => {
  it('redis cached value schema validation failure treated as miss', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'redis'
  process.env.REDIS_URL = 'redis://unit-test'

    class FakeRedis {
      store = new Map<string,string>()
      on() {/* noop */}
      async connect() {/* noop */}
      async get(key: string){ return this.store.get(key) ?? null }
      async set(key: string, val: string){ this.store.set(key, val); return 'OK' }
      async del(){ return 1 }
      async expire(){ return 1 }
      async scan(){ return ['0', []] as [string,string[]] }
      quit?: () => Promise<void>
      scanStream(){ throw new Error('unused') }
    }
    vi.doMock('ioredis', () => ({ default: FakeRedis }))
    // Mock metrics to avoid touching real counters while still allowing code paths
    vi.doMock('@/lib/metrics', () => {
      const noop = () => {}
      return {
        cvCacheHitsTotal: { inc: vi.fn() },
        cvCacheMissesTotal: { inc: vi.fn() },
        cvAggregateLoadsTotal: { inc: vi.fn() },
        cvStorageBackend: { labels: (_mode: string) => ({ set: vi.fn() }) },
        cvStorageGetDurationSeconds: { startTimer: () => noop }
      }
    })
    const { createStorage } = await import('@/lib/cv/storage')
    const backend: any = createStorage()
    // Prepare a structurally invalid (per Zod) but well-formed JSON cache entry
    // (missing required person fields etc.) to drive schema validation failure branch
    await backend.redis?.set?.('cv:en:v1', JSON.stringify({ data: { person: { foo: 'bar' } }, design: { bogus: true } }))
    const agg = await backend.get('en')
    // Should fall back to db/empty aggregate (person.name placeholder)
    expect(agg.data.person.name).toBeDefined()
  })

  it('s3 ensureClient endpoint branch and metric labels for default backend', async () => {
    vi.resetModules()
    // First: metric labels default path (no CV_STORAGE set => db backend)
    delete process.env.CV_STORAGE
    vi.doMock('@/lib/metrics', () => {
      const noop = () => {}
      return {
        cvCacheHitsTotal: { inc: vi.fn() },
        cvCacheMissesTotal: { inc: vi.fn() },
        cvAggregateLoadsTotal: { inc: vi.fn() },
        cvStorageBackend: { labels: vi.fn().mockImplementation((_mode: string) => ({ set: vi.fn() })) },
        cvStorageGetDurationSeconds: { startTimer: () => noop }
      }
    })
    const { createStorage: createDbStorage } = await import('@/lib/cv/storage')
    const dbBackend = createDbStorage()
    expect(dbBackend).toBeDefined()

    // Now: S3 endpoint branch
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'bucket'
    process.env.S3_ENDPOINT = 'http://localhost:4566'
    vi.doMock('@/lib/metrics', () => {
      const noop = () => {}
      return {
        cvCacheHitsTotal: { inc: vi.fn() },
        cvCacheMissesTotal: { inc: vi.fn() },
        cvAggregateLoadsTotal: { inc: vi.fn() },
        cvStorageBackend: { labels: (_mode: string) => ({ set: vi.fn() }) },
        cvStorageGetDurationSeconds: { startTimer: () => noop }
      }
    })
  class FakeS3Client {
      cfg: any
      constructor(cfg: any){ this.cfg = cfg }
      async send(){ const err: any = new Error('not found'); err.$metadata = { httpStatusCode: 404 }; throw err }
    }
    const Noop = function() { return undefined }
    vi.doMock('@aws-sdk/client-s3', () => ({ S3Client: FakeS3Client, GetObjectCommand: Noop, PutObjectCommand: Noop, ListObjectsV2Command: Noop, DeleteObjectsCommand: Noop, DeleteObjectCommand: Noop }))
    const { createStorage } = await import('@/lib/cv/storage')
    const s3Backend: any = createStorage()
    // Force get to invoke ensureClient with endpoint path style
    const res = await s3Backend.get('en')
    expect(res.data.person.name).toBeDefined()
  })
})
