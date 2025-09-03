import { describe, it, expect, vi } from 'vitest'

// Covers S3 tryGetCached non-404 error branch (status != 404) so lines 190-191 in storage.ts

vi.mock('@/lib/metrics', () => ({
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} }
}))

// Mock service aggregate to avoid prisma access.
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({
    data: { person: { name: 'X', title: 'Y', profile: '', contact: { email: 'x@y.z' }, links: [] }, skills: [], projects: [] },
    design: { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#000', background: '#fff', surface: '#fff', text: '#000', mutedText: '#111' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] },
    source: 'db'
  })
}))

// Mock S3 client so GetObject throws non-404 error (httpStatusCode 500) exercising log.warn path.
vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    send(_cmd: unknown) {
      return Promise.reject(Object.assign(new Error('s3 boom'), { $metadata: { httpStatusCode: 500 } }))
    }
  }
  // Lightweight function stubs adequate for instanceof-free usage in storage.ts
  const GetObjectCommand = function(arg: unknown) { return { arg } }
  const PutObjectCommand = function(arg: unknown) { return { arg } }
  const ListObjectsV2Command = function(arg: unknown) { return { arg } }
  const DeleteObjectsCommand = function(arg: unknown) { return { arg } }
  const DeleteObjectCommand = function(arg: unknown) { return { arg } }
  return { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand }
})

describe('cv storage s3 non-404 error branch', () => {
  it('treats non-404 S3 get error as miss and returns db aggregate', async () => {
    vi.resetModules()
    process.env.CV_STORAGE = 's3'
    process.env.S3_BUCKET = 'bucket'
    const { createStorage } = await import('@/lib/cv/storage')
    const store = createStorage()
    const res = await store.get('en')
    expect(res.source === 'db' || res.source === 'empty').toBe(true)
    // ensure data came through mocked aggregate
    expect(res.data.person.name).toBe('X')
  })
})
