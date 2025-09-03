import { describe, it, beforeEach, expect, vi } from 'vitest'

// Metrics mock (minimal counters + histogram timer)
function createCounter() {
  let v = 0
  return { inc: () => { v += 1 }, get: () => ({ values: [{ value: v }] }) }
}
vi.mock('@/lib/metrics', () => ({
  pdfCacheHitsTotal: createCounter(),
  pdfCacheMissesTotal: createCounter(),
  pdfCacheGetDurationSeconds: { startTimer: () => () => {} },
  pdfCacheEntries: { set: () => {} },
  // Storage metrics (indirect imports via sample data -> storage)
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
}))

// Helper to read counter value (label-free counters)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function counterValue(counter: any): number { try { return counter.get().values?.[0]?.value ?? 0 } catch { return 0 } }

describe('PdfCache s3 backend failure / disabled branches', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.S3_BUCKET
    process.env.PDF_CACHE_BACKEND = 's3'
  })

  it('disables backend when bucket missing (ensure() early disable)', async () => {
    const { PdfCache } = await import('@/lib/pdf-cache')
    const { pdfCacheMissesTotal } = await import('@/lib/metrics')
    const missBefore = counterValue(pdfCacheMissesTotal)
    const cache = new PdfCache({ maxEntries: 5, ttlMs: 10_000 })
    expect(cache.kind).toBe('s3') // still reports s3
    const key = PdfCache.hash({ no: 'bucket' })
    expect(await cache.get(key)).toBeUndefined() // miss path (disabled)
    const missAfter = counterValue(pdfCacheMissesTotal)
    expect(missAfter).toBe(missBefore + 1)
    // set() and invalidate should be no-ops and not throw
    await cache.set(key, Buffer.from('x'))
    await cache.invalidate('*')
  })

  it('covers get/set/invalidate error catch blocks', async () => {
    // Provide bucket so S3 client attempts to init
    process.env.S3_BUCKET = 'pdf-bucket'
    process.env.AWS_REGION = 'us-east-1'
    // Mock S3 client with failing operations to hit catch {} branches
    vi.doMock('@aws-sdk/client-s3', () => {
      class GetObjectCommand { constructor(public input: unknown) {} }
      class PutObjectCommand { constructor(public input: unknown) {} }
      class DeleteObjectsCommand { constructor(public input: unknown) {} }
      class ListObjectsV2Command { constructor(public input: unknown) {} }
      class DeleteObjectCommand { constructor(public input: unknown) {} }
  class S3Client {
        async send(cmd: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (cmd instanceof GetObjectCommand) throw new Error('get fail')
          if (cmd instanceof PutObjectCommand) throw new Error('put fail')
          if (cmd instanceof ListObjectsV2Command) {
            // Return one object so that subsequent DeleteObjectsCommand path is exercised and fails
            return { Contents: [{ Key: 'pdf-cache/abc.bin' }] }
          }
          if (cmd instanceof DeleteObjectsCommand) throw new Error('delete objects fail')
          if (cmd instanceof DeleteObjectCommand) throw new Error('delete object fail')
          return {}
        }
      }
      return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand, ListObjectsV2Command }
    })
    const { PdfCache } = await import('@/lib/pdf-cache')
    const { pdfCacheMissesTotal, pdfCacheHitsTotal } = await import('@/lib/metrics')
    const missBefore = counterValue(pdfCacheMissesTotal)
    const hitBefore = counterValue(pdfCacheHitsTotal)
    const cache = new PdfCache({ maxEntries: 5, ttlMs: 10_000 })
    const key = PdfCache.hash({ e: 'fail' })
    expect(await cache.get(key)).toBeUndefined() // get failure -> miss
    const missAfter1 = counterValue(pdfCacheMissesTotal)
    expect(missAfter1).toBe(missBefore + 1)
    await cache.set(key, Buffer.from('ignored')) // put failure swallowed
    // invalidate * triggers list + delete objects failure swallowed
    await cache.invalidate('*')
    // miss counter should not increase due to set/invalidate (only get path increments)
    const missAfter2 = counterValue(pdfCacheMissesTotal)
    expect(missAfter2).toBe(missAfter1)
    expect(counterValue(pdfCacheHitsTotal)).toBe(hitBefore) // no hits
  })

  it('disables backend when dynamic import of @aws-sdk/client-s3 throws (init catch branch)', async () => {
    vi.resetModules()
    process.env.PDF_CACHE_BACKEND = 's3'
    process.env.S3_BUCKET = 'pdf-bucket'
    // Mock logger to observe warn invocation (not strictly asserted, just ensuring path executes)
    vi.doMock('@/lib/logger', () => ({ logger: { warn: vi.fn(), info: () => {}, error: () => {} } }))
    // Force dynamic import failure
    vi.doMock('@aws-sdk/client-s3', () => { throw new Error('init boom') })
    const { PdfCache } = await import('@/lib/pdf-cache')
    const { pdfCacheMissesTotal } = await import('@/lib/metrics')
    const missBefore = counterValue(pdfCacheMissesTotal)
    const cache = new PdfCache({ maxEntries: 1, ttlMs: 1000 })
    const key = PdfCache.hash({ fail: true })
    expect(await cache.get(key)).toBeUndefined()
    expect(counterValue(pdfCacheMissesTotal)).toBe(missBefore + 1)
  })

  it('covers S3 get path where Body present but lacks transformToString (miss) and single-key invalidate catch', async () => {
    vi.resetModules()
    process.env.PDF_CACHE_BACKEND = 's3'
    process.env.S3_BUCKET = 'pdf-bucket'
    process.env.AWS_REGION = 'us-east-1'
    vi.doMock('@aws-sdk/client-s3', () => {
      class GetObjectCommand { constructor(public input: unknown) {} }
      class PutObjectCommand { constructor(public input: unknown) {} }
      class DeleteObjectCommand { constructor(public input: unknown) {} }
      class ListObjectsV2Command { constructor(public input: unknown) {} }
      class DeleteObjectsCommand { constructor(public input: unknown) {} }
      class S3Client {
        async send(cmd: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (cmd instanceof GetObjectCommand) return { Body: {} } // no transformToString -> miss path
          if (cmd instanceof DeleteObjectCommand) throw new Error('delete object fail') // single-key invalidate catch
          return {}
        }
      }
      return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand }
    })
    const { PdfCache } = await import('@/lib/pdf-cache')
    const { pdfCacheMissesTotal, pdfCacheHitsTotal } = await import('@/lib/metrics')
    const missBefore = counterValue(pdfCacheMissesTotal)
    const hitBefore = counterValue(pdfCacheHitsTotal)
    const cache = new PdfCache({ maxEntries: 2, ttlMs: 1000 })
    const key = PdfCache.hash({ empty: 'body' })
    expect(await cache.get(key)).toBeUndefined()
    expect(counterValue(pdfCacheMissesTotal)).toBe(missBefore + 1)
    await cache.invalidate(key) // triggers DeleteObjectCommand error swallow branch
    expect(counterValue(pdfCacheHitsTotal)).toBe(hitBefore)
  })
})
