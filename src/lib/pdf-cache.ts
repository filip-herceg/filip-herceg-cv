import crypto from 'crypto'
import { pdfCacheEntries, pdfCacheHitsTotal, pdfCacheMissesTotal, pdfCacheGetDurationSeconds } from './metrics'
import { logger } from './logger'

// Pluggable backends: memory (default), redis, s3 (object store). Focus on simple get/set semantics.
// Interface kept minimal to avoid heavy abstractions.
export interface PdfCacheBackend {
  get(key: string): Promise<Buffer | undefined> | Buffer | undefined
  set(key: string, buf: Buffer): Promise<void> | void
  invalidate?(key: string): Promise<void> | void // use '*' convention by passing literal string
  close?(): Promise<void> | void
  readonly kind: string
}

interface Entry { key: string; buf: Buffer; createdAt: number; lastAccess: number }

export interface PdfCacheOptions { maxEntries: number; ttlMs: number }

const DEFAULT_OPTS: PdfCacheOptions = {
  maxEntries: Number(process.env.PDF_CACHE_MAX_ENTRIES || 50),
  ttlMs: Number(process.env.PDF_CACHE_TTL_MS || 5 * 60_000),
}

class MemoryPdfCache implements PdfCacheBackend {
  readonly kind = 'memory'
  private readonly map = new Map<string, Entry>()
  constructor(private readonly opts: PdfCacheOptions) {}
  get(key: string): Buffer | undefined {
    const ent = this.map.get(key)
    if (!ent) { pdfCacheMissesTotal.inc({}); return undefined }
    const now = Date.now()
    if (now - ent.createdAt >= this.opts.ttlMs) { this.map.delete(key); pdfCacheEntries.set(this.map.size); pdfCacheMissesTotal.inc({}); return undefined }
    ent.lastAccess = now; pdfCacheHitsTotal.inc({}); return ent.buf
  }
  set(key: string, buf: Buffer) {
    if (this.map.has(key)) {
      const ent = this.map.get(key)!
      ent.buf = buf
      ent.lastAccess = Date.now()
      ent.createdAt = ent.lastAccess
    } else {
      if (this.map.size >= this.opts.maxEntries) this.evict()
      this.map.set(key, { key, buf, createdAt: Date.now(), lastAccess: Date.now() })
    }
    pdfCacheEntries.set(this.map.size)
  }
  private evict() { let oldest: Entry | undefined; for (const ent of this.map.values()) { if (!oldest || ent.lastAccess < oldest.lastAccess) oldest = ent } if (oldest) this.map.delete(oldest.key) }
}

class RedisPdfCache implements PdfCacheBackend {
  readonly kind = 'redis'
  private client: { get(key: string): Promise<string | null>; set(key: string, value: string, opts: { EX: number }): Promise<void>; del: (...keys: string[]) => Promise<void>; scan(cursor: string, opts: { MATCH: string; COUNT: number }): Promise<{ cursor: string; keys: string[] }>; quit?: () => Promise<void>; on?: (ev: string, cb: (...a: unknown[]) => void) => void } | undefined
  private disabled = false
  private readonly ttl = Number(process.env.PDF_CACHE_TTL_MS || DEFAULT_OPTS.ttlMs) / 1000
  private async ensure() {
    if (this.client || this.disabled) return this.client
    const url = process.env.REDIS_URL
    if (!url) { this.disabled = true; return undefined }
    try {
      const mod = await import('redis') as unknown as { createClient: (cfg: { url: string }) => RedisPdfCache['client'] }
  this.client = mod.createClient({ url })
  this.client?.on?.('error', () => { /* silence */ })
  // @ts-expect-error connect exists on actual redis client; omitted from narrow type to avoid bundling types
  this.client?.connect?.().catch(() => { this.disabled = true })
    } catch (e) { logger.warn({ err: e }, 'pdf redis cache init failed'); this.disabled = true }
    return this.client
  }
  private k(key: string) { return `pdf:${key}:v1` }
  async get(key: string) {
    const c = await this.ensure(); if (!c) { pdfCacheMissesTotal.inc({}); return undefined }
    try { const raw = await c.get(this.k(key)); if (!raw) { pdfCacheMissesTotal.inc({}); return undefined }; const buf = Buffer.from(raw, 'base64'); pdfCacheHitsTotal.inc({}); return buf } catch { pdfCacheMissesTotal.inc({}); return undefined }
  }
  async set(key: string, buf: Buffer) {
    const c = await this.ensure(); if (!c) return
    try { await c.set(this.k(key), buf.toString('base64'), { EX: this.ttl }) } catch {}
  }
  async invalidate(key: string) {
    const c = await this.ensure();
    if (!c) return
    if (key === '*') {
      try {
        let cursor = '0'
        do {
          const res = await c.scan(cursor, { MATCH: 'pdf:*:v1', COUNT: 100 })
          cursor = res.cursor
          const keys = res.keys
          if (keys.length) await c.del(...keys)
        } while (cursor !== '0')
      } catch {/* ignore */}
      return
    }
    try { await c.del(this.k(key)) } catch {/* ignore */}
  }
  async close() { try { await this.client?.quit?.() } catch {} }
}

class S3PdfCache implements PdfCacheBackend {
  readonly kind = 's3'
  private s3: { send(cmd: unknown): Promise<any> } | undefined // eslint-disable-line @typescript-eslint/no-explicit-any
  private disabled = false
  private readonly bucket = process.env.S3_BUCKET
  private readonly prefix = (process.env.S3_PDF_PREFIX || 'pdf-cache').replace(/\/$/, '')
  private async ensure() {
    if (this.s3 || this.disabled) return this.s3
    if (!this.bucket) { this.disabled = true; return undefined }
    try {
  const mod = await import('@aws-sdk/client-s3') as unknown as { S3Client: new (cfg: Record<string, unknown>) => S3PdfCache['s3'] }
  const endpoint = process.env.S3_ENDPOINT
  const cfg: Record<string, unknown> = { region: process.env.AWS_REGION || 'us-east-1' }
      if (endpoint) { cfg.endpoint = endpoint; cfg.forcePathStyle = true }
      this.s3 = new mod.S3Client(cfg)
    } catch (e) { logger.warn({ err: e }, 'pdf s3 cache init failed'); this.disabled = true }
    return this.s3
  }
  private key(k: string) { return `${this.prefix}/${k}.bin` }
  async get(key: string) {
    const c = await this.ensure(); if (!c) { pdfCacheMissesTotal.inc({}); return undefined }
    try {
  const mod = await import('@aws-sdk/client-s3') as unknown as { GetObjectCommand: new (cfg: Record<string,string>) => unknown }
  const res: { Body?: { transformToString?: () => Promise<string> } } = await c.send(new mod.GetObjectCommand({ Bucket: this.bucket!, Key: this.key(key) }))
  const bodyStream = res.Body
  const b64: string | undefined = typeof bodyStream?.transformToString === 'function' ? await bodyStream.transformToString() : undefined
      if (!b64) { pdfCacheMissesTotal.inc({}); return undefined }
      const buf = Buffer.from(b64, 'base64'); pdfCacheHitsTotal.inc({}); return buf
    } catch { pdfCacheMissesTotal.inc({}); return undefined }
  }
  async set(key: string, buf: Buffer) {
    const c = await this.ensure(); if (!c) return
    try {
  const mod = await import('@aws-sdk/client-s3') as unknown as { PutObjectCommand: new (cfg: Record<string,string>) => unknown }
  await c.send(new mod.PutObjectCommand({ Bucket: this.bucket!, Key: this.key(key), Body: buf.toString('base64'), ContentType: 'application/octet-stream' }))
    } catch {/* ignore */}
  }
  async invalidate(key: string) {
    const c = await this.ensure(); if (!c) return
    try {
      const mod = await import('@aws-sdk/client-s3') as unknown as { ListObjectsV2Command: new (cfg: Record<string, unknown>) => unknown; DeleteObjectsCommand: new (cfg: Record<string, unknown>) => unknown; DeleteObjectCommand: new (cfg: Record<string, string>) => unknown }
      if (key === '*') {
        let token: string | undefined
        do {
          const list = await c.send(new mod.ListObjectsV2Command({ Bucket: this.bucket!, Prefix: `${this.prefix}/`, ContinuationToken: token })) as { NextContinuationToken?: string; Contents?: { Key?: string }[] }
          token = list.NextContinuationToken
          const del = (list.Contents || []).map((o) => ({ Key: o.Key! }))
          if (del.length) await c.send(new mod.DeleteObjectsCommand({ Bucket: this.bucket!, Delete: { Objects: del, Quiet: true } }))
        } while (token)
      } else {
        await c.send(new mod.DeleteObjectCommand({ Bucket: this.bucket!, Key: this.key(key) }))
      }
    } catch {/* ignore */}
  }
}

export class PdfCache {
  private readonly backend: PdfCacheBackend
  constructor(private readonly opts: PdfCacheOptions = DEFAULT_OPTS) {
    this.backend = this.createBackend()
  }
  static hash(selection: Record<string, unknown>): string { return crypto.createHash('sha256').update(JSON.stringify(selection)).digest('hex').slice(0, 32) }
  private createBackend(): PdfCacheBackend {
    const mode = (process.env.PDF_CACHE_BACKEND || '').toLowerCase()
    if (mode === 'redis') return new RedisPdfCache()
    if (mode === 's3') return new S3PdfCache()
    return new MemoryPdfCache(this.opts)
  }
  async get(key: string) { return this.backend.get(key) }
  async timedGet(key: string) { // convenience (not used yet outside maybe future)
    const end = (pdfCacheGetDurationSeconds as unknown as { startTimer?: (l: Record<string,string>) => (lab?: Record<string,string>) => void }).startTimer?.({ backend: this.kind })
    const res = await this.get(key)
    try { end?.() } catch {}
    return res
  }
  async set(key: string, buf: Buffer) { await this.backend.set(key, buf) }
  async invalidate(key: string) { await this.backend.invalidate?.(key) }
  async close() { await this.backend.close?.() }
  get kind() { return this.backend.kind }
}

// Singleton factory ensuring consistent backend
export const pdfCache = new PdfCache()
