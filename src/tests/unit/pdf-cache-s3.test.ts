// Inject metrics mock before loading cache implementation
function createCounter() {
  let v = 0
  return { inc: () => { v += 1 }, get: () => ({ values: [{ value: v }] }) }
}
  vi.mock('@/lib/metrics', () => ({
    pdfCacheHitsTotal: createCounter(),
    pdfCacheMissesTotal: createCounter(),
    pdfCacheGetDurationSeconds: { startTimer: () => () => {} },
    pdfCacheEntries: { set: () => {} },
    // Storage metrics accessed indirectly via cv/sample-data imports
    cvStorageGetDurationSeconds: { startTimer: () => () => {} },
    cvCacheHitsTotal: { inc: () => {} },
    cvCacheMissesTotal: { inc: () => {} },
    cvAggregateLoadsTotal: { inc: () => {} },
    cvStorageBackend: { labels: () => ({ set: () => {} }) },
  }))
import { describe, it, beforeEach, expect, vi } from 'vitest'

// Helper for counter value (no labels)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function counterValue(counter: any): number { try { return counter.get().values?.[0]?.value ?? 0 } catch { return 0 } }

describe('PdfCache s3 backend (mocked)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.PDF_CACHE_BACKEND = 's3'
    process.env.S3_BUCKET = 'pdf-bucket'
    process.env.AWS_REGION = 'us-east-1'
    vi.doMock('@aws-sdk/client-s3', () => {
      class BodyWrapper { constructor(private readonly val: string) {} async transformToString() { return this.val } }
      class GetObjectCommand { constructor(public input: { Bucket: string; Key: string }) {} }
      class PutObjectCommand { constructor(public input: { Bucket: string; Key: string; Body: string; ContentType?: string }) {} }
      class DeleteObjectCommand { constructor(public input: { Bucket: string; Key: string }) {} }
      class ListObjectsV2Command { constructor(public input: { Bucket: string; Prefix: string; ContinuationToken?: string }) {} }
      class DeleteObjectsCommand { constructor(public input: { Bucket: string; Delete: { Objects: { Key: string }[]; Quiet?: boolean } }) {} }
      class S3Client {
        private readonly store = new Map<string, string>()
        private createBody(str: string) { return new BodyWrapper(str) }
        async send(cmd: unknown) {
          if (cmd instanceof GetObjectCommand) return this.handleGet(cmd)
          if (cmd instanceof PutObjectCommand) return this.handlePut(cmd)
          if (cmd instanceof DeleteObjectCommand) return this.handleDelOne(cmd)
          if (cmd instanceof ListObjectsV2Command) return this.handleList(cmd)
          if (cmd instanceof DeleteObjectsCommand) return this.handleDelMany(cmd)
          return {}
        }
        private handleGet(cmd: GetObjectCommand) {
          const v = this.store.get(cmd.input.Key)
          if (!v) { const err = new Error('NotFound') as Error & { $metadata?: { httpStatusCode: number } }; err.$metadata = { httpStatusCode: 404 }; throw err }
          return { Body: this.createBody(v) }
        }
        private handlePut(cmd: PutObjectCommand) { this.store.set(cmd.input.Key, cmd.input.Body); return {} }
        private handleDelOne(cmd: DeleteObjectCommand) { this.store.delete(cmd.input.Key); return {} }
        private handleList(cmd: ListObjectsV2Command) {
          const p = cmd.input.Prefix
          const contents: { Key: string }[] = []
          for (const k of this.store.keys()) if (k.startsWith(p)) contents.push({ Key: k })
          return { Contents: contents }
        }
        private handleDelMany(cmd: DeleteObjectsCommand) {
          for (const o of cmd.input.Delete.Objects) this.store.delete(o.Key)
          return {}
        }
      }
      return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand }
    })
  })

  it('records miss then hit', async () => {
    const { PdfCache } = await import('@/lib/pdf-cache')
    const { pdfCacheHitsTotal, pdfCacheMissesTotal } = await import('@/lib/metrics')
  const missBefore = counterValue(pdfCacheMissesTotal)
  const hitBefore = counterValue(pdfCacheHitsTotal)
    const cache = new PdfCache({ maxEntries: 10, ttlMs: 60_000 })
    const key = PdfCache.hash({ a: 's3' })
    expect(await cache.get(key)).toBeUndefined()
  const missAfter = counterValue(pdfCacheMissesTotal)
    expect(missAfter).toBe(missBefore + 1)
    await cache.set(key, Buffer.from('pdf-s3'))
    expect((await cache.get(key))?.toString()).toBe('pdf-s3')
  const hitAfter = counterValue(pdfCacheHitsTotal)
    expect(hitAfter).toBe(hitBefore + 1)
  })

  it('invalidate * removes objects', async () => {
    const { PdfCache } = await import('@/lib/pdf-cache')
    const cache = new PdfCache({ maxEntries: 10, ttlMs: 60_000 })
    const k = PdfCache.hash({ b: 2 })
    await cache.set(k, Buffer.from('blob'))
    expect(await cache.get(k)).toBeInstanceOf(Buffer)
    await cache.invalidate('*')
    expect(await cache.get(k)).toBeUndefined()
  })
})
