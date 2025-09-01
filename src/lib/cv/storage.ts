// Lint note: dynamic optional deps (Redis/S3) require some defensive typing.
// Keep unknown where libraries may not be present; validate JSON via Zod.
import { CvDataSchema, CvDesignSchema, type CvData, type CvDesign } from './schema'
import cvEn from './data/cv.en.json'
import designEn from './data/design.en.json'
import { getAggregate as dbGetAggregate, seedIfEmpty as dbSeedIfEmpty } from './service'
import { cvCacheHitsTotal, cvCacheMissesTotal, cvStorageBackend, cvAggregateLoadsTotal, cvStorageGetDurationSeconds } from '@/lib/metrics'
import pino from 'pino'
// Lazy optional redis import; avoids hard dependency for test environments without ioredis installed.
// Use unknown instead of any for lazy-loaded library reference
// Narrow when constructing the client.
let RedisLib: unknown
async function ensureRedisLib() {
  if (!RedisLib) {
    try {
  const mod = await import('ioredis')
  // ioredis exports a constructor as default; retain original shape in unknown typed var
  RedisLib = (mod as { default?: unknown }).default || mod
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`ioredis not installed or failed to load: ${msg}`)
    }
  }
  return RedisLib
}
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export type AggregateSource = 'db' | 'memory' | 'empty' | 'redis' | 's3'

export interface AggregateResult { data: CvData; design: CvDesign; source: AggregateSource }

export interface CvStorageBackend {
  get(locale: string): Promise<AggregateResult>
  seedIfEmpty?(locale: string, data: CvData, design: CvDesign): Promise<boolean>
  invalidate?(locale: string): void
  close?(): Promise<void> | void
}

const log = pino({ name: 'cv-storage' })

function normErr(e: unknown) {
  return e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : e
}

// Minimal Redis client surface we rely on (avoids broad any & missing type dependency)
interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>
  scanStream(options: Record<string, unknown>): NodeJS.ReadableStream
  del(...keys: string[]): Promise<number>
  expire(key: string, ttl: number): Promise<number>
  on(event: string, listener: (...args: unknown[]) => void): void
  connect(): Promise<void>
  // Optional members used via existence checks
  quit?(): Promise<void>
  // Simple scan signature (ioredis style)
  scan(cursor: string, matchToken: string, pattern: string, countToken: string, count: string): Promise<[string, string[]]>
}

type HistogramLike = { startTimer?: (labels: Record<string,string>) => () => void }

// Memory backend (seed only, no persistence)
class MemoryBackend implements CvStorageBackend {
  private readonly cache = new Map<string, { data: CvData; design: CvDesign }>()
  private readonly seedData = CvDataSchema.parse(cvEn)
  private readonly seedDesign = CvDesignSchema.parse(designEn)
  async get(locale: string): Promise<AggregateResult> {
  const endTimer = (cvStorageGetDurationSeconds as HistogramLike).startTimer?.({ backend: 'memory' }) // defensive if histogram absent
  const existed = this.cache.has(locale)
    if (!existed) {
      this.cache.set(locale, { data: this.seedData, design: this.seedDesign })
      try { cvCacheMissesTotal.inc({ backend: 'memory' }) } catch {}
    } else {
      try { cvCacheHitsTotal.inc({ backend: 'memory' }) } catch {}
    }
    const entry = this.cache.get(locale)!
  const res = { ...entry, source: 'memory' as const }
  try { endTimer?.() } catch {}
  return res
  }
  async seedIfEmpty(): Promise<boolean> { return false } // nothing to do
  invalidate(locale: string) { if (locale === '*') this.cache.clear(); else this.cache.delete(locale) }
}

// Database backend wraps existing service layer
class DatabaseBackend implements CvStorageBackend {
  async get(locale: string): Promise<AggregateResult> {
  const endTimer = (cvStorageGetDurationSeconds as HistogramLike).startTimer?.({ backend: 'db' })
  const agg = await dbGetAggregate(locale)
    try { cvCacheMissesTotal.inc({ backend: 'db' }) } catch {}
  const res = { data: agg.data, design: agg.design, source: agg.source === 'db' ? 'db' as const : 'empty' as const }
  try { endTimer?.() } catch {}
  return res
  }
  async seedIfEmpty(locale: string, data: CvData, design: CvDesign) { return dbSeedIfEmpty(locale, data, design) }
  // mark unused param with underscore to satisfy lint
  invalidate(_locale: string) { /* service layer exposes its own invalidation; optional future hook */ }
}

// Redis backend: distributed cache layered over DB
class RedisBackend implements CvStorageBackend {
  private redis?: RedisLike
  private disabled = false
  private readonly ttl: number
  constructor() { this.ttl = parseInt(process.env.CV_REDIS_TTL || '300', 10) }
  private async getClient(): Promise<RedisLike | undefined> {
    if (this.disabled) return undefined
    if (!this.redis) {
      try {
        const Lib = await ensureRedisLib()
  type RedisConstructor = new (url: string, opts: Record<string, unknown>) => RedisLike
  const RedisCtor = Lib as RedisConstructor
        this.redis = new RedisCtor(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 3 })
        this.redis.on('error', (err: unknown) => { log.warn({ err: normErr(err) }, 'redis error') })
        this.redis.connect().catch((err: unknown) => { log.warn({ err: normErr(err) }, 'redis connect failed'); this.disabled = true })
      } catch (e) { log.warn({ err: normErr(e) }, 'ioredis init failed'); this.disabled = true }
    }
    return this.redis
  }
  private key(locale: string) { return `cv:${locale}:v1` }
  async get(locale: string): Promise<AggregateResult> {
  const endTimerOuter = (cvStorageGetDurationSeconds as HistogramLike).startTimer?.({ backend: 'redis' })
    const client = await this.getClient()
    const cached = await this.tryGetCached(locale, client)
  if (cached) { try { endTimerOuter?.() } catch {}; return cached }
    try { cvCacheMissesTotal.inc({ backend: 'redis' }) } catch {}
    const agg = await dbGetAggregate(locale)
    if (agg.source === 'db' && client && !this.disabled) {
  try { await client.set(this.key(locale), JSON.stringify({ data: agg.data, design: agg.design }), 'EX', this.ttl) } catch (e) { log.warn({ err: normErr(e) }, 'redis set failed') }
    }
  const res = { data: agg.data, design: agg.design, source: agg.source === 'db' ? 'db' as const : 'empty' as const }
  try { endTimerOuter?.() } catch {}
  return res
  }

  private async tryGetCached(locale: string, client: RedisLike | undefined): Promise<AggregateResult | undefined> {
    if (!client || this.disabled) return undefined
    try {
      const raw = await client.get(this.key(locale))
      if (!raw) return undefined
      try {
        const parsed = JSON.parse(raw) as { data: unknown; design: unknown }
        const dataRes = CvDataSchema.safeParse(parsed.data)
        const designRes = CvDesignSchema.safeParse(parsed.design)
        if (dataRes.success && designRes.success) {
          try {
            cvCacheHitsTotal.inc({ backend: 'redis' })
            cvAggregateLoadsTotal.inc({ source: 'redis' as const })
          } catch {}
          return { data: dataRes.data, design: designRes.data, source: 'redis' }
        }
        log.warn({ locale }, 'redis cached value schema validation failed; treating as miss')
      } catch (e) {
  log.warn({ err: normErr(e) }, 'redis cached value parse failed; treating as miss')
      }
    } catch (e) {
  log.warn({ err: normErr(e) }, 'redis get failed')
    }
    return undefined
  }
  async seedIfEmpty(locale: string, data: CvData, design: CvDesign) {
    const seeded = await dbSeedIfEmpty(locale, data, design)
    if (seeded) {
      const client = await this.getClient()
      if (client && !this.disabled) {
  try { await client.set(this.key(locale), JSON.stringify({ data, design }), 'EX', this.ttl) } catch (e) { log.debug({ err: normErr(e) }, 'redis seed set failed') }
      }
    }
    return seeded
  }
  invalidate(locale: string) {
    // fire and forget
  void this.getClient().then(client => {
      const c = client
      if (c && !this.disabled) {
        if (locale === '*') {
          const pattern = 'cv:*:v1'
          const scanDel = async () => {
            try {
              let cursor = '0'
              do {
                const [nextCursor, keys] = await c.scan(cursor, 'MATCH', pattern, 'COUNT', '100')
                cursor = nextCursor
                if (keys.length) await c.del(...keys)
              } while (cursor !== '0')
            } catch (e) { log.debug({ err: normErr(e) }, 'redis scan/del failed') }
          }
          void scanDel().catch(() => {})
        } else {
          void c.del(this.key(locale)).catch(() => {})
        }
      }
    }).catch(() => {})
  }
  async close() {
    if (this.redis && !this.disabled) {
  try { await this.redis.quit?.() } catch (e) { log.debug({ err: normErr(e) }, 'redis quit failed') }
    }
  }
}

// S3 backend: object-store cache (JSON blobs) layered over DB (eventual consistency OK for CV)
class S3Backend implements CvStorageBackend {
  private s3?: S3Client
  private disabled = false
  private readonly bucket = process.env.S3_BUCKET
  private readonly prefix = process.env.S3_PREFIX || 'cv'
  private ensureClient() {
    if (this.disabled || this.s3 || !this.bucket) return this.s3
    try {
      const endpoint = process.env.S3_ENDPOINT
      const cfg: Record<string, unknown> = { region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1' }
  if (endpoint) { (cfg as { endpoint?: string; forcePathStyle?: boolean }).endpoint = endpoint; (cfg as { endpoint?: string; forcePathStyle?: boolean }).forcePathStyle = true }
      this.s3 = new S3Client(cfg)
  } catch (e) { log.warn({ err: normErr(e) }, 's3 init failed; disabling S3 backend'); this.disabled = true }
    return this.s3
  }
  private key(locale: string) { return `${this.prefix}/${locale}/v1.json` }
  async get(locale: string): Promise<AggregateResult> {
  const endTimerOuter = (cvStorageGetDurationSeconds as HistogramLike).startTimer?.({ backend: 's3' })
    const client = this.ensureClient()
    const cached = await this.tryGetCached(locale, client)
  if (cached) { try { endTimerOuter?.() } catch {}; return cached }
    try { cvCacheMissesTotal.inc({ backend: 's3' }) } catch {}
    const agg = await dbGetAggregate(locale)
    if (agg.source === 'db' && client && !this.disabled && this.bucket) {
  void this.store(locale, agg.data, agg.design).catch(() => {})
    }
  const res = { data: agg.data, design: agg.design, source: agg.source === 'db' ? 'db' as const : 'empty' as const }
  try { endTimerOuter?.() } catch {}
  return res
  }
  // Attempt to fetch cached aggregate from S3
  private async tryGetCached(locale: string, client: S3Client | undefined): Promise<AggregateResult | undefined> {
    if (!client || this.disabled || !this.bucket) return undefined
    try {
  const res = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key(locale) }))
  const bodyStream = (res as { Body?: { transformToString?: () => Promise<string> } }).Body
  const body: string | undefined = bodyStream?.transformToString ? await bodyStream.transformToString() : undefined
      if (!body) return undefined
      const parsed = JSON.parse(body) as { data: unknown; design: unknown }
      const dataRes = CvDataSchema.safeParse(parsed.data)
      const designRes = CvDesignSchema.safeParse(parsed.design)
      if (dataRes.success && designRes.success) {
        try { cvCacheHitsTotal.inc({ backend: 's3' }); cvAggregateLoadsTotal.inc({ source: 's3' as const }) } catch {}
        return { data: dataRes.data, design: designRes.data, source: 's3' }
      }
      log.warn({ locale }, 's3 cached value schema invalid; miss')
    } catch (e) {
  const status = (e as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
  if (status && status !== 404) {
        log.warn({ err: normErr(e) }, 's3 get failed')
      }
    }
    return undefined
  }
  private async store(locale: string, data: CvData, design: CvDesign) {
    if (this.disabled || !this.bucket) return
    try {
      if (this.s3) {
        await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: this.key(locale), Body: JSON.stringify({ data, design }), ContentType: 'application/json' }))
      }
  } catch (e) { log.warn({ err: normErr(e) }, 's3 put failed') }
  }
  async seedIfEmpty(locale: string, data: CvData, design: CvDesign) {
    const seeded = await dbSeedIfEmpty(locale, data, design)
    const client = this.ensureClient()
    if (seeded && client && !this.disabled && this.bucket) {
  void this.store(locale, data, design).catch(() => {})
    }
    return seeded
  }
  invalidate(locale: string) {
    const client = this.ensureClient()
    if (!client || this.disabled || !this.bucket) return
  void (async () => {
      try {
        if (locale === '*') {
          let token: string | undefined
          do {
            const listResp = await client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: `${this.prefix}/`, ContinuationToken: token }))
            const lr = listResp as { NextContinuationToken?: string; Contents?: { Key?: string }[] }
            token = lr.NextContinuationToken
            const contents = lr.Contents || []
            const toDelete = contents
              .filter((obj: { Key?: string }) => obj.Key?.endsWith('/v1.json'))
              .map((obj: { Key?: string }) => ({ Key: obj.Key as string }))
            if (toDelete.length) {
              await client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: toDelete, Quiet: true } }))
            }
          } while (token)
        } else {
          await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(locale) }))
        }
      } catch (e) {
        log.warn({ err: normErr(e) }, 's3 invalidate failed')
      }
    })().catch(() => {})
  }
  close() { /* no-op for S3 */ }
}

// Future backends (Redis, S3, etc.) could be added here.

export function createStorage(): CvStorageBackend {
  const mode = (process.env.CV_STORAGE || '').toLowerCase()
  let backend: CvStorageBackend
  switch (mode) {
    case 'memory':
    case 'in-memory':
      backend = new MemoryBackend(); break
    case 'redis':
      backend = new RedisBackend(); break
    case 's3':
      backend = new S3Backend(); break
    case 'db':
    case 'database':
    default:
      backend = new DatabaseBackend(); break
  }
  try { (cvStorageBackend as { labels?: (v: string) => { set: (n: number) => void } }).labels?.(mode || 'db').set(1) } catch {}
  return backend
}

export const defaultSeedData = CvDataSchema.parse(cvEn)
export const defaultSeedDesign = CvDesignSchema.parse(designEn)
