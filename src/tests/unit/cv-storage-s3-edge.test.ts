import { describe, it, expect, vi, beforeAll } from 'vitest'

// Goal: drive remaining uncovered S3Backend branches in cv/storage.ts
// Branches targeted:
//  - s3 cached value schema invalid (returns miss)
//  - s3 get non-404 error path (logs warn)
//  - s3 put failure path (logs warn)
//  - invalidate single locale (DeleteObjectCommand)
//  - invalidate all locales with pagination (ListObjectsV2Command w/ continuation)
//  - invalidate error catch (List failure)

// Minimal metrics mock (same pattern as existing storage-s3.test) so we can observe counters without prom-client
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

// Expose last S3 client via global for direct store manipulation (untyped to avoid lint noise)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setLastClient = (c: any) => { (globalThis as any).__lastMockS3Client = c }

// Seed data (valid JSON shape)
import seedDataEn from '@/lib/cv/data/cv.en.json'
import seedDesignEn from '@/lib/cv/data/design.en.json'

// Mock service layer returning consistent aggregate (db source) so S3 layer will attempt async store
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({ data: seedDataEn, design: seedDesignEn, source: 'db' as const }),
  seedIfEmpty: async () => false,
}))

// Build advanced S3 mock with controllable failure flags & pagination simulation
function buildEdgeMock() {
  class GetObjectCommand { constructor(public input: any) {} } // eslint-disable-line @typescript-eslint/no-explicit-any
  class PutObjectCommand { constructor(public input: any) {} }
  class DeleteObjectCommand { constructor(public input: any) {} }
  class ListObjectsV2Command { constructor(public input: any) {} }
  class DeleteObjectsCommand { constructor(public input: any) {} }
  class S3Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store = new Map<string, any>()
    forceGetError = false
    failPut = false
    failList = false
    paginationMode = true
    listCalls = 0
  constructor(_cfg: Record<string, unknown>) { setLastClient(this) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(cmd: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (cmd instanceof GetObjectCommand) return this.get(cmd)
      if (cmd instanceof PutObjectCommand) return this.put(cmd)
      if (cmd instanceof DeleteObjectCommand) return this.delOne(cmd)
      if (cmd instanceof ListObjectsV2Command) return this.list(cmd)
      if (cmd instanceof DeleteObjectsCommand) return this.delMany(cmd)
      return {}
    }
    get(cmd: GetObjectCommand) {
      if (this.forceGetError) { const e: any = new Error('boom'); e.$metadata = { httpStatusCode: 500 }; throw e } // eslint-disable-line @typescript-eslint/no-explicit-any
      const body = this.store.get(cmd.input.Key)
      if (body === undefined) { const err: any = new Error('NotFound'); err.$metadata = { httpStatusCode: 404 }; throw err } // eslint-disable-line @typescript-eslint/no-explicit-any
      return { Body: { transformToString: async () => body } }
    }
    put(cmd: PutObjectCommand) { if (this.failPut) { const e: any = new Error('put fail'); throw e } this.store.set(cmd.input.Key, cmd.input.Body); return {} } // eslint-disable-line @typescript-eslint/no-explicit-any
    list(cmd: ListObjectsV2Command) {
      if (this.failList) { const e: any = new Error('list fail'); throw e } // eslint-disable-line @typescript-eslint/no-explicit-any
      const prefix = cmd.input.Prefix as string
      const keys = [...this.store.keys()].filter(k => k.startsWith(prefix))
      if (!this.paginationMode) return { Contents: keys }
      // simulate two-page listing; first returns half + token
      this.listCalls++
      if (this.listCalls === 1) {
        const firstHalf = keys.slice(0, Math.max(1, Math.ceil(keys.length / 2)))
        return { Contents: firstHalf.map(k => ({ Key: k })), NextContinuationToken: 'next' }
      }
      return { Contents: keys.map(k => ({ Key: k })) }
    }
    delOne(cmd: DeleteObjectCommand) { this.store.delete(cmd.input.Key); return {} }
    delMany(cmd: DeleteObjectsCommand) { for (const o of (cmd as any).input.Delete.Objects) { this.store.delete(o.Key) } return {} } // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand }
}

describe('cv storage s3 edge/error coverage', () => {
  beforeAll(() => {
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'edge-bucket'
    process.env.S3_PREFIX = 'cv'
    process.env.AWS_REGION = 'us-east-1'
    vi.doMock('@aws-sdk/client-s3', () => buildEdgeMock())
  })

  it('covers schema invalid, non-404 get error, put failure, invalidate variants & error', async () => {
    vi.resetModules() // ensure fresh backend creation using our mock
    const { createStorage } = await import('@/lib/cv/storage')
    const storage: any = createStorage() // eslint-disable-line @typescript-eslint/no-explicit-any

    // 1: Initial miss -> aggregates from db, schedules async store
    const miss = await storage.get('en')
    expect(miss.source === 'db' || miss.source === 'empty').toBe(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s3: any = (globalThis as any).__lastMockS3Client!
    // Wait microtask for async void store
    await Promise.resolve()
    const keyEn = 'cv/en/v1.json'
    expect(s3.store.has(keyEn)).toBe(true)

    // 2: Hit path valid schema
    const hit = await storage.get('en')
    expect(hit.source).toBe('s3')

    // 3: Insert invalid schema (missing required structure) -> should treat as miss & re-store
    const keyBad = 'cv/bad/v1.json'
    s3.store.set(keyBad, JSON.stringify({ data: {}, design: {} })) // invalid vs schema (empty objects)
    const missBad = await storage.get('bad')
    expect(missBad.source === 'db' || missBad.source === 'empty').toBe(true)

    // 4: Non-404 error path (forceGetError) -> warn path (treated as miss)
    s3.forceGetError = true
    const missErr = await storage.get('err')
    expect(missErr.source === 'db' || missErr.source === 'empty').toBe(true)
    s3.forceGetError = false

    // 5: Put failure path: new locale triggers async store failure
    s3.failPut = true
    const putFail = await storage.get('putfail')
    expect(putFail.source === 'db' || putFail.source === 'empty').toBe(true)
    await Promise.resolve()
    expect(s3.store.has('cv/putfail/v1.json')).toBe(false) // ensure it was not stored
    s3.failPut = false

    // 6: invalidate single locale (en)
    storage.invalidate('en')
    await Promise.resolve()
    expect(s3.store.has(keyEn)).toBe(false)

    // 7: Add multiple keys then wildcard invalidate with pagination
    s3.store.set(keyEn, JSON.stringify({ data: seedDataEn, design: seedDesignEn }))
    s3.store.set('cv/extra/v1.json', JSON.stringify({ data: seedDataEn, design: seedDesignEn }))
    storage.invalidate('*')
    // wait for async invalidate loop (pagination) to finish; poll with backoff (max ~100ms)
    {
      const startSize = s3.store.size
      let lastSize = startSize
      for (let i = 0; i < 20 && s3.store.size > 0; i++) { // eslint-disable-line no-await-in-loop
        await new Promise(r => setTimeout(r, i < 5 ? 0 : 5))
        // break early if size reached zero
        if (s3.store.size === 0) break
        // if size stopped changing after several iterations, allow a few more then proceed
        if (s3.store.size === lastSize && i > 10) break
        lastSize = s3.store.size
      }
    }
    expect([...s3.store.keys()].length).toBe(0)

    // 8: Failure inside invalidate (list failure) -> should not throw
    s3.store.set(keyEn, JSON.stringify({ data: seedDataEn, design: seedDesignEn }))
    s3.failList = true
    storage.invalidate('*') // swallow error path
    for (let i = 0; i < 3; i++) { // allow loop attempt
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 0))
    }
    // After failure path, store still intact
    expect(s3.store.has(keyEn)).toBe(true)

  // 9: cover close() no-op
  storage.close()
  })
})
