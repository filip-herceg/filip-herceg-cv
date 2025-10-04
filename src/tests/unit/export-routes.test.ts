import { describe, it, expect, beforeEach, vi } from 'vitest'

// Utilities to re-import a module after altering env / mocks
async function importConfigsRoute() {
  return await import('@/app/api/export/configs/route')
}
async function importGenerateRoute() {
  return await import('@/app/api/export/generate/route')
}

// Common valid export config body
const validConfig = {
  name: 'Test',
  sections: [{ key: 'PROFILE' }],
  density: 'normal',
  colorMode: 'auto',
  paperSize: 'A4'
}

// Minimal aggregate shape for selection (only fields accessed by deriveSelection)
const aggregate = {
  skills: [{ id: 's1', locale: 'en', name: 'TS', category: 'lang', level: null, years: null, tagsJson: null, createdAt: new Date(), updatedAt: new Date() }],
  projects: [],
  experiences: [],
  education: [],
  certifications: [],
  traits: [],
  hobbies: [],
  person: { name: 'Tester' }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

// Mock auth to allow toggling success / failure per test
vi.mock('@/lib/auth/guard', () => ({
  requireAdmin: vi.fn(async () => ({ ok: true, body: { ok: true }, status: 200 }))
}))

// Mock cookie store + context (unused deeper)
vi.mock('@/lib/auth/cookies', () => ({
  NextCookieStore: class { async init() { return this } }
}))
vi.mock('@/lib/auth/context', () => ({
  buildAuthContext: () => ({})
}))

// Mock logger helpers to no-op
vi.mock('@/lib/logger', () => ({
  withRequestContext: () => ({ id: 'r' }),
  logEvent: () => {},
  logError: () => {}
}))

// Mock cv aggregate and prisma accessor used by export routes
const repoRows: any[] = []
const prismaMock = {
  exportConfig: {
    findMany: async () => [...repoRows],
    findUnique: async ({ where: { id } }: any) => repoRows.find(r => r.id === id) || null,
    create: async ({ data }: any) => {
      const row = { id: String(repoRows.length + 1), name: data.name, presetType: data.presetType ?? null, json: data.json, version: 1, createdAt: new Date(), updatedAt: new Date() }
      repoRows.push(row)
      return row
    },
    update: async ({ where: { id }, data }: any) => {
      const idx = repoRows.findIndex(r => r.id === id)
      if (idx === -1) {
        throw Object.assign(new Error('nf'), { code: 'P2025' })
      }
      const existing = repoRows[idx]
      const updated = { ...existing, name: data.name, presetType: data.presetType ?? null, json: data.json, version: existing.version + 1, updatedAt: new Date() }
      repoRows[idx] = updated
      return updated
    },
    delete: async ({ where: { id } }: any) => {
      const idx = repoRows.findIndex(r => r.id === id)
      if (idx === -1) {
        throw Object.assign(new Error('nf'), { code: 'P2025' })
      }
      repoRows.splice(idx, 1)
      return {}
    }
  }
}
vi.mock('@/lib/cv/service', () => ({
  getAggregate: async () => ({ data: aggregate }),
  getPrisma: () => prismaMock,
}))
vi.mock('@/lib/pdf/generate', () => ({
  generateCvPdf: async () => ({ final: new Uint8Array([1,2,3]), person: { name: 'Tester' } })
}))

// Simple in-memory pdf cache
let pdfCacheStore = new Map<string, Uint8Array>()
vi.mock('@/lib/pdf-cache', () => ({
  pdfCache: {
    async get(key: string) { return pdfCacheStore.get(key) },
    async set(key: string, val: Uint8Array) { pdfCacheStore.set(key, val) }
  },
  // Provide minimal PdfCache static used by the route for robust key building
  PdfCache: {
    buildRobustKey(input: unknown) {
      // Deterministic string based on input to keep cache keys stable across calls
      try { return 'mock:' + JSON.stringify(input) } catch { return 'mock:err' }
    }
  }
}))

// Use real metrics implementation to avoid missing export mismatches

// No need to mock '@prisma/client' here, since routes use getPrisma()

// Mock metrics with minimal counters / histograms used in export + other code paths to avoid missing export errors.
vi.mock('@/lib/metrics', () => {
  function counter() { return { inc: () => {} } }
  function histogram() { return { observe: () => {}, startTimer: () => () => {} } }
  return {
    exportRequestsTotal: counter(),
    exportCacheHitTotal: counter(),
    exportCacheMissTotal: counter(),
    exportSuccessTotal: counter(),
    exportFailureTotal: { inc: () => {} },
    exportPdfSizeBytes: histogram(),
  exportDurationSeconds: histogram(),
  exportSelectionDeriveDurationSeconds: histogram(),
    // Additional symbols referenced indirectly through other imports during dynamic module load
    cvStorageGetDurationSeconds: histogram(),
    pdfCacheGetDurationSeconds: histogram(),
    pdfGenerationDurationSeconds: histogram(),
    pdfCacheEntries: { set: () => {} },
    pdfCacheHitsTotal: counter(),
    pdfCacheMissesTotal: counter(),
    pdfRequestsTotal: counter(),
    registry: { metrics: async () => '' },
  }
})

describe('export configs route', () => {
  it('returns 501 when feature disabled', async () => {
    process.env.EXPORT_ENABLED = 'false'
    const mod = await importConfigsRoute()
  const res = await mod.GET(new Request('http://x/api/export/configs'))
  expect(res?.status).toBe(501)
  })

  it('lists configs when enabled and authed', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    // dynamic import after env change
    const mod = await importConfigsRoute()
    // create a row via POST
  const postRes = await mod.POST(new Request('http://x/api/export/configs', { method: 'POST', body: JSON.stringify(validConfig) }))
  expect(postRes?.status).toBe(201)
  const getRes = await mod.GET(new Request('http://x/api/export/configs'))
  const json = await getRes?.json()
  expect(getRes?.status).toBe(200)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect((json).configs.length).toBe(1)
  })

  it('updates a config successfully (optimistic concurrency happy path)', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    const mod = await importConfigsRoute()
    const createRes = await mod.POST(new Request('http://x/api/export/configs', { method: 'POST', body: JSON.stringify(validConfig) }))
    expect(createRes?.status).toBe(201)
  const created = await createRes?.json()
    const id = created.config.id
    const version: number = created.config.version
    const updatedBody = { id, version, config: { ...validConfig, name: 'Updated Name' } }
    const putRes = await mod.PUT(new Request('http://x/api/export/configs', { method: 'PUT', body: JSON.stringify(updatedBody) }))
    expect(putRes?.status).toBe(200)
  const updated = await putRes?.json()
    expect(updated.config.name).toBe('Updated Name')
    expect(updated.config.version).toBe(version + 1)
  })

  it('returns 409 on version conflict', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    const mod = await importConfigsRoute()
    const createRes = await mod.POST(new Request('http://x/api/export/configs', { method: 'POST', body: JSON.stringify(validConfig) }))
    expect(createRes?.status).toBe(201)
  const created = await createRes?.json()
    const id = created.config.id
    // Intentionally use wrong version (0) to trigger conflict
    const putRes = await mod.PUT(new Request('http://x/api/export/configs', { method: 'PUT', body: JSON.stringify({ id, version: 0, config: validConfig }) }))
    expect(putRes?.status).toBe(409)
  })

  it('returns 404 on update when id not found', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    const mod = await importConfigsRoute()
    const putRes = await mod.PUT(new Request('http://x/api/export/configs', { method: 'PUT', body: JSON.stringify({ id: 'does-not-exist', version: 1, config: validConfig }) }))
    expect(putRes?.status).toBe(404)
  })

  it('returns 400 on update invalid shape', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    const mod = await importConfigsRoute()
    const putRes = await mod.PUT(new Request('http://x/api/export/configs', { method: 'PUT', body: JSON.stringify({}) }))
    expect(putRes?.status).toBe(400)
  })

  it('deletes config successfully', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    const mod = await importConfigsRoute()
    const createRes = await mod.POST(new Request('http://x/api/export/configs', { method: 'POST', body: JSON.stringify(validConfig) }))
  const created = await createRes?.json()
    const id = created.config.id
    const delRes = await mod.DELETE(new Request('http://x/api/export/configs', { method: 'DELETE', body: JSON.stringify({ id }) }))
    expect(delRes?.status).toBe(200)
  const body = await delRes?.json()
    expect(body.removed).toBe(true)
  })

  it('returns 404 on delete not found', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    const mod = await importConfigsRoute()
    const delRes = await mod.DELETE(new Request('http://x/api/export/configs', { method: 'DELETE', body: JSON.stringify({ id: 'missing' }) }))
    expect(delRes?.status).toBe(404)
  })

  it('returns 400 on delete invalid shape', async () => {
    process.env.EXPORT_ENABLED = 'true'
    repoRows.length = 0
    const mod = await importConfigsRoute()
    const delRes = await mod.DELETE(new Request('http://x/api/export/configs', { method: 'DELETE', body: JSON.stringify({}) }))
    expect(delRes?.status).toBe(400)
  })
})

describe('export generate route', () => {
  it('returns disabled when flag off', async () => {
    process.env.EXPORT_ENABLED = 'false'
    const mod = await importGenerateRoute()
  const res = await mod.POST(new Request('http://x/api/export/generate', { method: 'POST', body: JSON.stringify({ config: validConfig }) }) as unknown as import('next/server').NextRequest)
  expect(res?.status).toBe(501)
  })

  it('returns validation error for bad body', async () => {
    process.env.EXPORT_ENABLED = 'true'
    const mod = await importGenerateRoute()
  const res = await mod.POST(new Request('http://x/api/export/generate', { method: 'POST', body: JSON.stringify({ config: { name: 'OnlyName' } }) }) as unknown as import('next/server').NextRequest)
  expect(res?.status).toBe(400)
  })

  it('generates pdf (MISS then HIT)', async () => {
    process.env.EXPORT_ENABLED = 'true'
    pdfCacheStore = new Map()
    const mod = await importGenerateRoute()
    const reqBody = { config: validConfig }
  const missRes = await mod.POST(new Request('http://x/api/export/generate', { method: 'POST', body: JSON.stringify(reqBody) }) as unknown as import('next/server').NextRequest)
  expect(missRes?.status).toBe(200)
  expect(missRes?.headers.get('X-Cache')).toBe('MISS')
  const hitRes = await mod.POST(new Request('http://x/api/export/generate', { method: 'POST', body: JSON.stringify(reqBody) }) as unknown as import('next/server').NextRequest)
  expect(hitRes?.status).toBe(200)
  expect(hitRes?.headers.get('X-Cache')).toBe('HIT')
  })
})
