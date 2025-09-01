import { describe, it, expect, beforeEach, vi } from 'vitest'

// Metrics mock (labelled counters) to observe increments without real prom-client
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

// Minimal safe metric value extractor (avoids deep nesting)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCounterValue(counter: any, backend: string) {
  try {
    const data = counter.get?.()
    const values = data?.values as Array<any> | undefined // eslint-disable-line @typescript-eslint/no-explicit-any
    return values?.find(v => v.labels?.backend === backend)?.value ?? 0
  } catch { return 0 }
}

// Top-level lightweight mock to keep nesting low
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMockS3Module() {  
  class GetObjectCommand { constructor(public input: any) {} } // eslint-disable-line @typescript-eslint/no-explicit-any
  class PutObjectCommand { constructor(public input: any) {} } // eslint-disable-line @typescript-eslint/no-explicit-any
  class DeleteObjectCommand { constructor(public input: any) {} } // eslint-disable-line @typescript-eslint/no-explicit-any
  class ListObjectsV2Command { constructor(public input: any) {} } // eslint-disable-line @typescript-eslint/no-explicit-any
  class DeleteObjectsCommand { constructor(public input: any) {} } // eslint-disable-line @typescript-eslint/no-explicit-any
  class S3Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly store = new Map<string, any>()
    private wrap(body: string) { return { transformToString: async () => body } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(cmd: any) {
      if (cmd instanceof GetObjectCommand) return this.get(cmd)
      if (cmd instanceof PutObjectCommand) return this.put(cmd)
      if (cmd instanceof ListObjectsV2Command) return this.list(cmd)
      if (cmd instanceof DeleteObjectCommand) return this.delOne(cmd)
      if (cmd instanceof DeleteObjectsCommand) return this.delMany(cmd)
      return {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private get(cmd: any) {
      const key = cmd.input.Key
      if (!this.store.has(key)) { const err: any = new Error('NotFound'); err.$metadata = { httpStatusCode: 404 }; throw err } // eslint-disable-line @typescript-eslint/no-explicit-any
      return { Body: this.wrap(this.store.get(key)) }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private put(cmd: any) { this.store.set(cmd.input.Key, cmd.input.Body); return {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private list(cmd: any) {
      const prefix = cmd.input.Prefix as string
      const keys = [...this.store.keys()].filter(k => k.startsWith(prefix))
      return { Contents: keys.map(k => ({ Key: k })) }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private delOne(cmd: any) { this.store.delete(cmd.input.Key); return {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private delMany(cmd: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      for (const o of cmd.input.Delete.Objects) { this.store.delete(o.Key) }
      return {}
    }
  }
  return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand }
}

describe('CvStorageBackend s3 (mocked)', () => {
  beforeEach(async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'test-bucket'
    process.env.S3_PREFIX = 'cv'
    process.env.AWS_REGION = 'us-east-1'
    // Mock service aggregate
    vi.doMock('../../lib/cv/service', () => {
      const data = {
        person: { name: 'Tester', title: 'Dev', profile: 'Profile', contact: { email: 't@example.com' }, links: [] },
        skills: [],
        projects: []
      }
      const design = { page: { size: 'A4', margin: '20', columns: 2, gutter: '16' }, palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#fff', text: '#000', mutedText: '#444' }, typography: { body: 'system-ui', heading: 'system-ui', scale: 1 }, shapes: [], sections: [] }
      return { getAggregate: async () => ({ data, design, source: 'db' as const }), seedIfEmpty: async () => false }
    })
  // Mock AWS S3 client minimal surface (flat structure)
  vi.doMock('@aws-sdk/client-s3', () => buildMockS3Module())
  })

  it('records s3 miss then hit', async () => {
    const { createStorage } = await import('../../lib/cv/storage')
    const { cvCacheHitsTotal, cvCacheMissesTotal } = await import('../../lib/metrics')
    const backend = createStorage()
    const missBefore = getCounterValue(cvCacheMissesTotal, 's3')
    const hitBefore = getCounterValue(cvCacheHitsTotal, 's3')
    await backend.get('en')
    const missAfterFirst = getCounterValue(cvCacheMissesTotal, 's3')
  expect(missAfterFirst).toBeGreaterThanOrEqual(missBefore + 1)
    await backend.get('en')
    const hitAfterSecond = getCounterValue(cvCacheHitsTotal, 's3')
  expect(hitAfterSecond).toBeGreaterThanOrEqual(hitBefore + 1)
  })
})
