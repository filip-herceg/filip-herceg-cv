import { describe, it, expect, vi } from 'vitest'

// Target lines in storage.ts: 88-94 (redis tryGetCached parse failure + get failure),
// 162-170 (redis scan/del fallback path during invalidate '*'), 190-191 (redis quit catch),
// 266-272 (S3 ensureClient branch when no endpoint provided - already partly covered but cover path with endpoint undefined),
// 319 (cvStorageBackend metric labels fallback executed in createStorage).

describe('cv-storage micro branches', () => {
  it('redis tryGetCached parse failure and get failure, plus invalidate scan path', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 'redis'
  process.env.REDIS_URL = 'redis://unit-test'
    // Mock ioredis with minimal interface and controllable get/scan
    class FakeRedis {
      store = new Map<string,string>()
      errors: string[] = []
      backendType = 'redis'
      url: string | undefined
      constructor(url: string){ this.url = url }
      on(){/* no-op */}
      async connect(){/* no-op */}
      async get(key: string){
        if (key.includes('fail')) throw new Error('get boom')
        return this.store.get(key) ?? null
      }
      async set(key: string, val: string){ this.store.set(key, val); return 'OK' }
      async del(...keys: string[]){ keys.forEach(k => this.store.delete(k)); return keys.length }
      async expire(){ return 1 }
      // Simple scan returning keys chunk then done
      private scanCalled = false
      async scan(cursor: string, _m: string, pattern: string, _c: string, _count: string): Promise<[string,string[]]> {
        if (this.scanCalled) return ['0', []]
        this.scanCalled = true
        const keys = Array.from(this.store.keys()).filter(k => k.includes(pattern.replace('*','')))
        return ['0', keys]
      }
      async quit(){ throw new Error('quit fail') }
      scanStream(){ throw new Error('unused') }
    }
    vi.doMock('ioredis', () => ({ default: FakeRedis }))
    const { createStorage } = await import('@/lib/cv/storage')
    const backend: any = createStorage()
    // Preload a bad JSON cache entry to trigger parse fail path
    const badKey = 'cv:en:v1'
    await backend.redis?.set?.(badKey, '{bad json')
    // Call get will attempt parse -> warn -> treat as miss -> load from db -> since db lacks env it falls back to empty
    const agg = await backend.get('en')
    expect(agg.data.person.name).toBeDefined()
    // Invalidate all to trigger scan/del path
    backend.invalidate('*')
    // Force a get failure path
    await backend.redis?.set?.('cv:fail:v1', JSON.stringify({ data: {}, design: {} }))
    await backend.get('fail') // triggers get error log branch
    // Close to trigger quit failure catch
    await backend.close()
  })

  it('s3 ensureClient branch without endpoint still constructs client (no error)', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'bucket'
    delete process.env.S3_ENDPOINT
    // Mock S3Client minimal send for GetObject 404 path
  class FakeS3Client { async send(){ const err: any = new Error('not found'); err.$metadata = { httpStatusCode: 404 }; throw err } }
  const Noop = function() { return undefined }
  vi.doMock('@aws-sdk/client-s3', () => ({ S3Client: FakeS3Client, GetObjectCommand: Noop, PutObjectCommand: Noop, ListObjectsV2Command: Noop, DeleteObjectsCommand: Noop, DeleteObjectCommand: Noop }))
    const { createStorage } = await import('@/lib/cv/storage')
    const backend = createStorage()
    const res = await backend.get('en')
    expect(res.data.person).toBeDefined()
  })
})
