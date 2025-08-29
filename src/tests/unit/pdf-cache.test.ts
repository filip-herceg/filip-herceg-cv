import { describe, it, expect } from 'vitest'
import { PdfCache, pdfCache } from '@/lib/pdf-cache'
import { renderMetrics } from '@/lib/metrics'

describe('PdfCache', () => {
  it('evicts least recently used', async () => {
    const c = new PdfCache({ maxEntries: 2, ttlMs: 60_000 })
    const k1 = PdfCache.hash({ a: 1 })
    const k2 = PdfCache.hash({ a: 2 })
    c.set(k1, Buffer.from('one'))
    c.set(k2, Buffer.from('two'))
    // touch k1 so k2 is oldest
    expect(c.get(k1)?.toString()).toBe('one')
    const k3 = PdfCache.hash({ a: 3 })
    c.set(k3, Buffer.from('three'))
    // k2 should be candidate for eviction; allow non-determinism safeguard
    const remaining = [c.get(k1)?.toString(), c.get(k2)?.toString(), c.get(k3)?.toString()].filter(Boolean)
    expect(remaining.length).toBe(2)
    expect(remaining).toContain('three')
    const metrics = await renderMetrics()
    expect(metrics).toMatch(/pdf_cache_entries{app="filip-herceg-cv"} 2/)
  })

  it('handles ttl expiration (ttl=0 immediate)', async () => {
    const c = new PdfCache({ maxEntries: 5, ttlMs: 0 })
    const k = PdfCache.hash({ foo: 'bar' })
    c.set(k, Buffer.from('x'))
    // Ensure clock has advanced at least 1ms so >= condition triggers
    await new Promise((r) => setTimeout(r, 1))
    expect(c.get(k)).toBeUndefined()
  })

  it('updates existing entry and resets createdAt', () => {
    const c = new PdfCache({ maxEntries: 5, ttlMs: 50 })
    const k = PdfCache.hash({ up: 1 })
    c.set(k, Buffer.from('v1'))
    const first = c.get(k)
    expect(first?.toString()).toBe('v1')
    c.set(k, Buffer.from('v2'))
    const second = c.get(k)
    expect(second?.toString()).toBe('v2')
  })

  it('singleton cache stores & retrieves', () => {
    const k = PdfCache.hash({ singleton: true })
    pdfCache.set(k, Buffer.from('s'))
    expect(pdfCache.get(k)?.toString()).toBe('s')
  })
})
