import { describe, it, expect, vi } from 'vitest'

// Covers S3 tryGetCached schema invalid branch (lines 190-191 in storage.ts)

vi.mock('@/lib/metrics', () => ({
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} }
}))

// Mock service to avoid prisma access.
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({
    data: { person: { name: 'Seed', title: 'Role', profile: '', contact: { email: 'seed@example.com' }, links: [] }, skills: [], projects: [] },
    design: { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#000', background: '#fff', surface: '#fff', text: '#000', mutedText: '#222' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] },
    source: 'db'
  })
}))

// Mock S3 so GetObject returns body with structurally invalid JSON (fails Zod validation => schema invalid log path) then PutObject succeeds.
vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(cmd: any) {
      if (cmd && cmd.__type === 'GetObjectCommand') {
        return {
          Body: { transformToString: async () => JSON.stringify({ data: {}, design: {} }) }
        }
      }
      return {}
    }
  }
  const toObj = (a: unknown) => (typeof a === 'object' && a !== null ? a as Record<string, unknown> : {})
  const GetObjectCommand = function(args: unknown) { return { __type: 'GetObjectCommand', ...toObj(args) } }
  const PutObjectCommand = function(args: unknown) { return { __type: 'PutObjectCommand', ...toObj(args) } }
  const ListObjectsV2Command = function(args: unknown) { return { __type: 'ListObjectsV2Command', ...toObj(args) } }
  const DeleteObjectsCommand = function(args: unknown) { return { __type: 'DeleteObjectsCommand', ...toObj(args) } }
  const DeleteObjectCommand = function(args: unknown) { return { __type: 'DeleteObjectCommand', ...toObj(args) } }
  return { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand }
})

describe('cv storage s3 schema invalid branch', () => {
  it('treats invalid cached JSON schema as miss and falls back to db aggregate', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'bucket'
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    const res = await store.get('en')
    expect(res.data.person.name).toBe('Seed')
    expect(res.source === 'db' || res.source === 'empty').toBe(true)
  })
})
