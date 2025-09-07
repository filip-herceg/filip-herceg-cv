import { describe, it, expect, vi } from 'vitest'

// Focused micro coverage for remaining storage.ts branches:
//  - Redis cached JSON parses but fails schema validation -> treated as miss
//  - S3 ensureClient path when custom endpoint provided (forcePathStyle)
//  - createStorage default (db) backend metric label invocation

describe('cv-storage uncovered branches (replacement file)', () => {
  it('redis cached invalid schema treated as miss', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'redis'
  process.env.REDIS_URL = 'redis://unit-test'
    class FakeRedis {
      store = new Map<string,string>()
      on = () => {}
      connect = async () => {}
      async get(k: string){ return this.store.get(k) ?? null }
      async set(k: string,v: string){ this.store.set(k,v); return 'OK' }
      async del(){ return 1 }
      async expire(){ return 1 }
      async scan(){ return ['0', []] as [string,string[]] }
      quit?: () => Promise<void>
      scanStream(){ throw new Error('unused') }
    }
    vi.doMock('ioredis', () => ({ default: FakeRedis }))
    vi.doMock('@/lib/metrics', () => {
      const stop = () => {}
      return {
        cvCacheHitsTotal: { inc: vi.fn() },
        cvCacheMissesTotal: { inc: vi.fn() },
        cvAggregateLoadsTotal: { inc: vi.fn() },
        cvStorageBackend: { labels: () => ({ set: vi.fn() }) },
        cvStorageGetDurationSeconds: { startTimer: () => stop }
      }
    })
    const { createStorage } = await import('@/lib/cv/storage')
    const backend: any = createStorage()
    await backend.redis?.set?.('cv:en:v1', JSON.stringify({ data: { person: { foo: 'bar' } } }))
    const agg = await backend.get('en')
    expect(agg.data.person.name).toBeTruthy()
  })

  it('s3 ensureClient endpoint + default db metric labels', async () => {
    vi.resetModules()
    delete process.env.CV_STORAGE
    vi.doMock('@/lib/metrics', () => {
      const stop = () => {}
      return {
        cvCacheHitsTotal: { inc: vi.fn() },
        cvCacheMissesTotal: { inc: vi.fn() },
        cvAggregateLoadsTotal: { inc: vi.fn() },
        cvStorageBackend: { labels: vi.fn().mockImplementation(() => ({ set: vi.fn() })) },
        cvStorageGetDurationSeconds: { startTimer: () => stop }
      }
    })
    const { createStorage: createDbStorage } = await import('@/lib/cv/storage')
    expect(createDbStorage()).toBeDefined()

    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'bucket'
    process.env.S3_ENDPOINT = 'http://endpoint'
    vi.doMock('@/lib/metrics', () => {
      const stop = () => {}
      return {
        cvCacheHitsTotal: { inc: vi.fn() },
        cvCacheMissesTotal: { inc: vi.fn() },
        cvAggregateLoadsTotal: { inc: vi.fn() },
        cvStorageBackend: { labels: () => ({ set: vi.fn() }) },
        cvStorageGetDurationSeconds: { startTimer: () => stop }
      }
    })
    class FakeS3Client { constructor(public cfg: any){} async send(){ const e: any = new Error('nf'); e.$metadata={ httpStatusCode:404 }; throw e } }
    const Noop = function() { return undefined }
    vi.doMock('@aws-sdk/client-s3', () => ({ S3Client: FakeS3Client, GetObjectCommand: Noop, PutObjectCommand: Noop, ListObjectsV2Command: Noop, DeleteObjectsCommand: Noop, DeleteObjectCommand: Noop }))
    const { createStorage } = await import('@/lib/cv/storage')
    const s3Backend: any = createStorage()
    const res = await s3Backend.get('en')
    expect(res.data.person.name).toBeTruthy()
  })
})