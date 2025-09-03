import { describe, it, beforeEach, expect, vi } from 'vitest'

// Metrics mock reused
function createCounter() { let v = 0; return { inc: () => { v += 1 }, get: () => ({ values: [{ value: v }] }) } }
vi.mock('@/lib/metrics', () => ({
  pdfCacheHitsTotal: createCounter(),
  pdfCacheMissesTotal: createCounter(),
  pdfCacheGetDurationSeconds: { startTimer: () => () => {} },
  pdfCacheEntries: { set: () => {} },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
}))

// Helper to read counter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function counterValue(counter: any): number { try { return counter.get().values?.[0]?.value ?? 0 } catch { return 0 } }

// Targets remaining uncovered line 92 in pdf-cache.ts (S3 ensure branch with endpoint/forcePathStyle)
describe('PdfCache s3 endpoint configuration branch', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.PDF_CACHE_BACKEND = 's3'
    process.env.S3_BUCKET = 'pdf-bucket'
    process.env.S3_ENDPOINT = 'http://localhost:4566' // triggers endpoint + forcePathStyle branch
    process.env.AWS_REGION = 'us-east-1'
    // Minimal S3 client mock just to allow operations
    vi.doMock('@aws-sdk/client-s3', () => {
      class GetObjectCommand { constructor(public input: unknown) {} }
      class PutObjectCommand { constructor(public input: unknown) {} }
      class DeleteObjectCommand { constructor(public input: unknown) {} }
      class ListObjectsV2Command { constructor(public input: unknown) {} }
      class DeleteObjectsCommand { constructor(public input: unknown) {} }
      class S3Client { async send() { return {} } }
      return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand }
    })
  })

  it('initializes client with endpoint (ensure branch) and performs miss then no-op set', async () => {
    const { PdfCache } = await import('@/lib/pdf-cache')
    const { pdfCacheMissesTotal } = await import('@/lib/metrics')
    const missBefore = counterValue(pdfCacheMissesTotal)
    const cache = new PdfCache({ maxEntries: 1, ttlMs: 1000 })
    const key = PdfCache.hash({ endpoint: true })
    // No object stored yet -> miss path
    await cache.get(key)
    expect(counterValue(pdfCacheMissesTotal)).toBe(missBefore + 1)
    // Setting then getting still misses because mock send for GetObjectCommand returns {} (no Body)
    await cache.set(key, Buffer.from('data'))
    await cache.get(key)
  })
})
