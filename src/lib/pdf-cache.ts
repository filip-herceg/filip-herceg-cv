import crypto from 'crypto'
import { pdfCacheEntries, pdfCacheHitsTotal, pdfCacheMissesTotal } from './metrics'

interface Entry { key: string; buf: Buffer; createdAt: number; lastAccess: number }

export interface PdfCacheOptions { maxEntries: number; ttlMs: number }

const DEFAULT_OPTS: PdfCacheOptions = {
  maxEntries: Number(process.env.PDF_CACHE_MAX_ENTRIES || 50),
  ttlMs: Number(process.env.PDF_CACHE_TTL_MS || 5 * 60_000),
}

export class PdfCache {
  private map = new Map<string, Entry>()
  constructor(private opts: PdfCacheOptions = DEFAULT_OPTS) {}

  static hash(selection: Record<string, unknown>): string {
    return crypto.createHash('sha256').update(JSON.stringify(selection)).digest('hex').slice(0, 32)
  }

  get(key: string): Buffer | undefined {
    const ent = this.map.get(key)
    if (!ent) {
      pdfCacheMissesTotal.inc()
      return undefined
    }
    const now = Date.now()
    // Expire when lifetime >= ttlMs so ttl=0 means immediate expiry
    if (now - ent.createdAt >= this.opts.ttlMs) {
      this.map.delete(key)
      pdfCacheEntries.set(this.map.size)
      pdfCacheMissesTotal.inc()
      return undefined
    }
    ent.lastAccess = now
    pdfCacheHitsTotal.inc()
    return ent.buf
  }

  set(key: string, buf: Buffer) {
    if (this.map.has(key)) {
      const ent = this.map.get(key)!
      ent.buf = buf
      ent.lastAccess = Date.now()
      ent.createdAt = Date.now()
    } else {
      if (this.map.size >= this.opts.maxEntries) this.evict()
      this.map.set(key, { key, buf, createdAt: Date.now(), lastAccess: Date.now() })
    }
    pdfCacheEntries.set(this.map.size)
  }

  private evict() {
    let oldest: Entry | undefined
    for (const ent of this.map.values()) {
      if (!oldest || ent.lastAccess < oldest.lastAccess) oldest = ent
    }
    if (oldest) this.map.delete(oldest.key)
  }
}

// Singleton cache instance used by PDF route
export const pdfCache = new PdfCache()
