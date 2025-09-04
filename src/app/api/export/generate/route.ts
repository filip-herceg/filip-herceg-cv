import { NextResponse, type NextRequest } from 'next/server'
import { FEATURE_EXPORT_ENABLED } from '@/lib/constants'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { ExportConfigInputSchema, type ExportConfigInput } from '@/lib/export/schema'
import { generateCvPdf } from '@/lib/pdf/generate'
import { exportRequestsTotal, exportCacheHitTotal, exportCacheMissTotal, exportPdfSizeBytes, exportSuccessTotal, exportFailureTotal } from '@/lib/metrics'
import { pdfCache } from '@/lib/pdf-cache'
import { withRequestContext, logEvent, logError } from '@/lib/logger'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { ExportConfigRepository } from '@/lib/export/service'
import { getAggregate } from '@/lib/cv/service'
import { deriveSelection, selectionToQueryParams, selectionHashParts } from '@/lib/export/selector'
import type { Logger } from 'pino'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Narrow internal histogram contract to avoid casting to any
interface HistogramLike { observe: (v: number) => void }
// prom-client Histogram has observe method; we defensively check while preserving type safety
const histogram: HistogramLike | undefined = (() => {
  const candidate = exportPdfSizeBytes as unknown as Partial<HistogramLike>
  return typeof candidate.observe === 'function' ? { observe: candidate.observe.bind(candidate) } : undefined
})()
const observeExportSize = (n: number): void => { histogram?.observe(n) }


interface LoadedConfig { cfg: ExportConfigInput; name: string }
interface LoadedConfigValidationError { error: 'VALIDATION'; issues: unknown }
interface LoadedConfigNotFound { error: 'CONFIG_NOT_FOUND' }
type LoadedConfigResult = LoadedConfig | LoadedConfigValidationError | LoadedConfigNotFound

type RequestBodyShape = { configId?: string | number; config?: unknown } | undefined | null

async function loadConfig(prisma: PrismaClient, body: unknown, logger: Logger): Promise<LoadedConfigResult> {
  const repo = new ExportConfigRepository(prisma)
  // Fast path: non-object body treated as inline config
  if (body === null || typeof body !== 'object') {
    const parsed = ExportConfigInputSchema.safeParse(body)
    if (!parsed.success) {
      logEvent(logger, 'domain:export.generate.validation_failed', { issues: parsed.error.issues.length })
      return { error: 'VALIDATION', issues: parsed.error.issues }
    }
    return { cfg: parsed.data, name: 'inline' }
  }

  const recordBody = body as RequestBodyShape
  const configIdRaw = recordBody?.configId
  if (configIdRaw != null) {
    if (typeof configIdRaw !== 'string' && typeof configIdRaw !== 'number') {
      return { error: 'VALIDATION', issues: [{ message: 'configId must be string or number' }] }
    }
    const record = await repo.get(String(configIdRaw))
    if (!record) return { error: 'CONFIG_NOT_FOUND' }
    const parsed = ExportConfigInputSchema.safeParse(record.json)
    if (!parsed.success) {
      logEvent(logger, 'domain:export.generate.validation_failed', { issues: parsed.error.issues.length })
      return { error: 'VALIDATION', issues: parsed.error.issues }
    }
    return { cfg: parsed.data, name: record.name }
  }

  const inlineSource = recordBody?.config !== undefined ? recordBody.config : body
  const parsed = ExportConfigInputSchema.safeParse(inlineSource)
  if (!parsed.success) {
    logEvent(logger, 'domain:export.generate.validation_failed', { issues: parsed.error.issues.length })
    return { error: 'VALIDATION', issues: parsed.error.issues }
  }
  return { cfg: parsed.data, name: 'inline' }
}

async function buildTargetUrl(cfg: ExportConfigInput, selectionParams: Record<string,string>): Promise<string> {
  const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const qs = Object.entries(selectionParams).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  return base + '/cv/print' + (qs ? `?${qs}` : '')
}

async function attemptCacheHit(cacheKey: string, cfg: ExportConfigInput, logger: Logger): Promise<NextResponse | undefined> {
  try {
    const cached = await pdfCache.get(cacheKey)
    if (cached) {
      exportCacheHitTotal.inc()
      exportRequestsTotal.inc({ result: 'cache_hit' })
      observeExportSize(cached.byteLength || (Array.isArray(cached) ? cached.length : 0))
      logEvent(logger, 'domain:export.generate.cache_hit', { key: cacheKey })
      return new NextResponse(new Uint8Array(cached), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${cfg.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-export.pdf"`, 'X-Cache': 'HIT' } })
    }
    exportCacheMissTotal.inc()
  } catch (e) {
    logError(logger, 'domain:export.generate.cache_get_error', e instanceof Error ? e : new Error('cache_get'))
  }
  return undefined
}

async function generateAndRespond(target: string, cacheKey: string, cfg: ExportConfigInput, configName: string, logger: Logger): Promise<NextResponse> {
  const { final, person } = await generateCvPdf(target)
  try { await pdfCache.set(cacheKey, final) } catch (e) { logError(logger, 'domain:export.generate.cache_set_error', e instanceof Error ? e : new Error('cache_set')) }
  exportRequestsTotal.inc({ result: 'success' })
  exportSuccessTotal.inc()
  observeExportSize(final.byteLength)
  logEvent(logger, 'domain:export.generate.success', { bytes: final.byteLength, key: cacheKey, config: configName })
  return new NextResponse(new Uint8Array(final), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${person.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-export.pdf"`, 'X-Cache': 'MISS' } })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const logger = withRequestContext(req)
  if (!FEATURE_EXPORT_ENABLED) {
    logEvent(logger, 'domain:export.generate.disabled')
    exportRequestsTotal.inc({ result: 'disabled' })
    return NextResponse.json({ error: 'EXPORT_DISABLED' }, { status: 501 })
  }
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) {
    logEvent(logger, 'domain:export.generate.auth_failed')
    exportRequestsTotal.inc({ result: 'unauthorized' })
    return NextResponse.json(auth.body, { status: auth.status })
  }

  let body: unknown = {}
  try { body = await req.json() } catch { /* ignore malformed */ }

  const prisma = new PrismaClient()
  const loaded = await loadConfig(prisma, body, logger)
  if ('error' in loaded) {
    exportRequestsTotal.inc({ result: loaded.error === 'CONFIG_NOT_FOUND' ? 'config_not_found' : 'invalid' })
    const status = loaded.error === 'CONFIG_NOT_FOUND' ? 404 : 400
    return NextResponse.json(loaded, { status })
  }
  const cfg = loaded.cfg
  const configName = loaded.name

  // Derive dynamic selection (IDs) from aggregate + config (first slice: apply global filters + per-section limit)
  const { data: agg } = await getAggregate('en')
  const selection = deriveSelection(cfg, agg)
  const selectionParams = selectionToQueryParams(cfg, selection)
  const target = await buildTargetUrl(cfg, selectionParams)
  logEvent(logger, 'domain:export.generate.selection_computed', { targetQuery: target.split('?')[1] || '', skills: selection.skills.length, projects: selection.projects.length, experiences: selection.experiences.length })

  // Deterministic cache key based on config contents
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(cfg))
    .update('|')
    .update(selectionHashParts(selection).join('|'))
    .digest('hex')
    .slice(0, 16)
  const cacheKey = `export:${hash}`
  const cachedResponse = await attemptCacheHit(cacheKey, cfg, logger)
  if (cachedResponse) {
    await prisma.$disconnect().catch(() => {})
    return cachedResponse
  }

  try {
    return await generateAndRespond(target, cacheKey, cfg, configName, logger)
  } catch (e) {
    const err = e instanceof Error ? e : new Error('export_failed')
    exportRequestsTotal.inc({ result: 'error' })
    exportFailureTotal.inc({ reason: err.name || 'Error' })
    logError(logger, 'domain:export.generate.error', err)
    return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: err.message === 'no_chromium' ? 501 : 500 })
  } finally {
    try { await prisma.$disconnect() } catch { /* ignore */ }
  }
}

