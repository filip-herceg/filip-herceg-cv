import { describe, it, beforeEach, expect, vi } from 'vitest'

function globToRegex(pattern: string): RegExp {
  const parts = pattern.split('*')
  const escaped = parts.map((p) => p.replace(/[-/\\^$+?.()|[\]{}]/g, (ch) => `\\${ch}`))
  return new RegExp('^' + escaped.join('.*') + '$')
}

// Mock metrics before importing cache
function createCounter() {
  let v = 0
  return { inc: () => { v += 1 }, get: () => ({ values: [{ value: v }] }) }
}
vi.mock('@/lib/metrics', () => ({
  pdfCacheHitsTotal: createCounter(),
  pdfCacheMissesTotal: createCounter(),
  pdfCacheGetDurationSeconds: { startTimer: () => () => {} },
  pdfCacheEntries: { set: () => {} },
  // Provide storage metrics to satisfy indirect imports via sample-data -> storage
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
}))

// Helper to read counter value (no labels used for pdf cache hit/miss counters)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function counterValue(counter: any): number {
  try { return counter.get().values?.[0]?.value ?? 0 } catch { return 0 }
}

describe('PdfCache redis backend (mocked)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.PDF_CACHE_BACKEND = 'redis'
    process.env.REDIS_URL = 'redis://localhost:6379'
    // Minimal redis mock
    vi.doMock('redis', () => {
      const store = new Map<string,string>()
      class MockRedisClient {
        async connect() { /* no-op */ }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on(_e: string, _h: any) { /* no-op */ }
        async get(k: string) { return store.get(k) || null }
        async set(k: string, v: string) { store.set(k, v); return 'OK' }
        async del(...keys: string[]) {
          for (const k of keys) store.delete(k)
          return keys.length
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async scan(cursor: string, opts: any) {
          if (cursor !== '0') return { cursor: '0', keys: [] }
          const match = opts?.MATCH as string | undefined
          const keys: string[] = []
          let regex: RegExp | undefined
          if (match) regex = globToRegex(match)
          for (const k of store.keys()) {
            if (!regex || regex.test(k)) keys.push(k)
          }
          return { cursor: '0', keys }
        }
        async quit() { /* no-op */ }
      }
      return { createClient: () => new MockRedisClient() }
    })
  })

  it('records miss then hit', async () => {
    const { PdfCache } = await import('@/lib/pdf-cache')
    const { pdfCacheHitsTotal, pdfCacheMissesTotal } = await import('@/lib/metrics')
  const missBefore = counterValue(pdfCacheMissesTotal)
  const hitBefore = counterValue(pdfCacheHitsTotal)
    const cache = new PdfCache({ maxEntries: 10, ttlMs: 60_000 })
    const key = PdfCache.hash({ a: 1 })
    expect(await cache.get(key)).toBeUndefined()
  const missAfter = counterValue(pdfCacheMissesTotal)
    expect(missAfter).toBe(missBefore + 1)
    await cache.set(key, Buffer.from('pdf'))
    expect((await cache.get(key))?.toString()).toBe('pdf')
  const hitAfter = counterValue(pdfCacheHitsTotal)
    expect(hitAfter).toBe(hitBefore + 1)
  })

  it('invalidate * removes entries', async () => {
    const { PdfCache } = await import('@/lib/pdf-cache')
    const cache = new PdfCache({ maxEntries: 10, ttlMs: 60_000 })
    const k = PdfCache.hash({ x: 1 })
    await cache.set(k, Buffer.from('body'))
    expect(await cache.get(k)).toBeInstanceOf(Buffer)
  await cache.invalidate('*')
  // Flush a couple of ticks to allow invalidate loop completion
  await new Promise(r => setTimeout(r, 0))
  await new Promise(r => setTimeout(r, 0))
  expect(await cache.get(k)).toBeUndefined()
  })
})
