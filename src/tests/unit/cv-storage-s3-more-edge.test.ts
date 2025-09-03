import { describe, it, beforeEach, expect, vi } from 'vitest'

function counter() { let v = 0; return { inc: () => { v += 1 }, get: () => ({ values: [{ value: v }] }) } }
vi.mock('@/lib/metrics', () => ({
  cvCacheHitsTotal: counter(),
  cvCacheMissesTotal: counter(),
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  pdfCacheHitsTotal: counter(), pdfCacheMissesTotal: counter(), pdfCacheGetDurationSeconds: { startTimer: () => () => {} }, pdfCacheEntries: { set: () => {} },
}))

// We mock the AWS SDK client used inside storage to drive distinct branches.
describe('CvStorage S3 additional edge branches', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'cv-bucket'
    process.env.S3_ENDPOINT = 'http://localhost:4566' // triggers endpoint + forcePathStyle branch
    process.env.AWS_REGION = 'us-east-1'
    let step = 0
    vi.doMock('@aws-sdk/client-s3', () => {
      class GetObjectCommand { constructor(public input: unknown) {} }
      class PutObjectCommand { constructor(public input: unknown) {} }
      class DeleteObjectCommand { constructor(public input: unknown) {} }
      class ListObjectsV2Command { constructor(public input: unknown) {} }
      class DeleteObjectsCommand { constructor(public input: unknown) {} }
      class BodyWrap { constructor(private readonly body: string) {} async transformToString() { return this.body } }
      class S3Client {
        async send(cmd: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (cmd instanceof GetObjectCommand) {
            step += 1
            if (step === 1) return { Body: new BodyWrap('{not-json') } // parse error
            if (step === 2) return { Body: new BodyWrap(JSON.stringify({ data: { nope: true }, design: { bad: true } })) } // schema invalid
            if (step === 3) { const err = new Error('boom') as Error & { $metadata?: { httpStatusCode?: number } }; err.$metadata = { httpStatusCode: 500 }; throw err } // non-404 error
            // success
            return { Body: new BodyWrap(JSON.stringify({ data: { person: { name: 'X' }, sections: [] }, design: { theme: 't' } })) }
          }
          if (cmd instanceof PutObjectCommand) return {}
          if (cmd instanceof DeleteObjectCommand) return {}
          if (cmd instanceof ListObjectsV2Command) return { Contents: [] }
          if (cmd instanceof DeleteObjectsCommand) return {}
          return {}
        }
      }
      return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand }
    })
  })

  it('exercises parse error, schema invalid, non-404 error, then success hit path', async () => {
    const { createStorage } = await import('@/lib/cv/storage')
    const storage = createStorage()
    // 1: parse error -> miss
    await storage.get('en')
    // 2: schema invalid -> miss
    await storage.get('en')
    // 3: non-404 error -> warn path
    await storage.get('en')
    // 4: success -> should record hit on subsequent immediate call (cache store happens async via void store(), so we invoke twice)
    const resFirst = await storage.get('en')
    const resSecond = await storage.get('en')
    expect(resFirst.data.person || resSecond.data.person).toBeDefined()
  })
})
