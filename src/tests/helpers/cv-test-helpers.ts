import { vi } from 'vitest'

// Reusable minimal CV seed objects
export const seedCvData = () => ({
  person: { name: 'Name', title: 'Title', profile: 'Profile', contact: { email: 'a@b.c' }, links: [] },
  skills: [],
  projects: []
})
export const seedCvDesign = () => ({
  page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' },
  palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#333' },
  typography: { body: 'sys', heading: 'sys', scale: 1 },
  shapes: [],
  sections: []
})

// Reset commonly mutated env vars between tests
export function resetCvEnv() {
  delete process.env.CV_STORAGE
  delete process.env.S3_BUCKET
  delete process.env.S3_ENDPOINT
  delete process.env.REDIS_URL
}

// Basic metric stubs (export individual factory so tests can inject capture callbacks)
export function makeMetricStubs(opts: { onBackendLabel?: (m: string) => void } = {}) {
  return {
    cvCacheHitsTotal: { inc: () => {} },
    cvCacheMissesTotal: { inc: () => {} },
    cvAggregateLoadsTotal: { inc: () => {} },
    cvStorageBackend: { labels: (m: string) => { opts.onBackendLabel?.(m); return { set: (_n: number) => {} } } },
    cvStorageGetDurationSeconds: { startTimer: () => () => {} }
  }
}

// Mock pino returning a silent logger capturing warnings optionally
export function mockPino(opts: { onWarn?: (msg: string) => void } = {}) {
  const logger = { warn: (_o: unknown, msg?: string) => { if (typeof _o === 'string') { opts.onWarn?.(_o) } else if (msg) { opts.onWarn?.(msg) } }, info: () => {}, debug: () => {} }
  vi.doMock('pino', () => ({ default: () => logger }))
  return logger
}

// Mock service layer aggregate with configurable source (db/empty)
export function mockCvServiceAggregate(source: 'db' | 'empty' = 'db', data = seedCvData(), design = seedCvDesign()) {
  vi.doMock('@/lib/cv/service', () => ({
    getAggregate: async () => ({ data, design, source }),
    seedIfEmpty: async () => false
  }))
}

// AWS S3 mock builder; pass behaviors for Get / Put etc.
type MaybePromise<T> = T | Promise<T>
// Generic override fn used in tests; defaults to void return
type S3OverrideFn<T = void> = () => MaybePromise<T>
export function mockS3(overrides: Partial<Record<'get'|'put'|'list'|'deleteObj'|'deleteMany', S3OverrideFn>> = {}) {
  class MockS3Client {
    async send(cmd: any) {
      const name = cmd.constructor.name
      if (name === 'GetObjectCommand') {
        if (overrides.get) return overrides.get()
        const err: any = new Error('not found'); err.$metadata = { httpStatusCode: 404 }; throw err
      }
      if (name === 'PutObjectCommand') {
        if (overrides.put) return overrides.put()
        return {}
      }
      if (name === 'ListObjectsV2Command') { return overrides.list?.() || { Contents: [] } }
      if (name === 'DeleteObjectCommand') { return overrides.deleteObj?.() || {} }
      if (name === 'DeleteObjectsCommand') { return overrides.deleteMany?.() || {} }
      return {}
    }
  }
  vi.doMock('@aws-sdk/client-s3', () => ({
    S3Client: MockS3Client,
    GetObjectCommand: class GetObjectCommand { constructor(public _args: any) {} },
    PutObjectCommand: class PutObjectCommand { constructor(public _args: any) {} },
    ListObjectsV2Command: class ListObjectsV2Command { constructor(public _args: any) {} },
    DeleteObjectsCommand: class DeleteObjectsCommand { constructor(public _args: any) {} },
    DeleteObjectCommand: class DeleteObjectCommand { constructor(public _args: any) {} }
  }))
}

// Lightweight Prisma mock generator for service tests
export function mockPrisma(options: { personExists?: boolean; invalidDesignJson?: boolean } = {}) {
  const { personExists = true, invalidDesignJson = false } = options
  class MockPrisma {
    person = {
      findUnique: async () => (personExists ? { locale: 'en', name: 'N', title: 'T', profile: 'P', email: 'e', location: null, phone: null, website: null, github: null, linkedin: null, twitter: null, linksJson: '[]' } : null),
      create: async () => ({})
    }
    skill = { findMany: async () => [], createMany: async () => {} }
    project = { findMany: async () => [], createMany: async () => {} }
    experience = { findMany: async () => [] }
    education = { findMany: async () => [] }
    certification = { findMany: async () => [] }
    trait = { findMany: async () => [] }
    hobby = { findMany: async () => [] }
    design = { findUnique: async () => (invalidDesignJson ? { pageJson: '{bad', paletteJson: '{}', typographyJson: '{}', shapesJson: '{}', sectionsJson: '{}' } : { pageJson: '{}', paletteJson: '{}', typographyJson: '{}', shapesJson: '[]', sectionsJson: '[]' }), upsert: async () => ({}) }
  }
  vi.doMock('@prisma/client', () => ({ PrismaClient: MockPrisma }))
}

// Utility to force S3Backend.store failure (override internal s3) after creation
export function forceS3StoreFailure(backend: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (backend as any).s3 = { send: () => { throw new Error('forced put fail') } }
}
