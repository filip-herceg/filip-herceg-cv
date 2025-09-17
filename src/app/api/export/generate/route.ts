import { NextResponse, type NextRequest } from 'next/server'
import { FEATURE_EXPORT_ENABLED } from '@/lib/constants'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { ExportConfigInputSchema, type ExportConfigInput } from '@/lib/export/schema'
import { generateCvPdf } from '@/lib/pdf/generate'
import { exportRequestsTotal, exportCacheHitTotal, exportCacheMissTotal, exportPdfSizeBytes, exportSuccessTotal, exportFailureTotal, exportDurationSeconds, exportSelectionDeriveDurationSeconds } from '@/lib/metrics'
import { pdfCache } from '@/lib/pdf-cache'
import { withRequestContext, logEvent, logError } from '@/lib/logger'
import crypto from 'crypto'
import type { PrismaClient } from '@prisma/client'
import { ExportConfigRepository } from '@/lib/export/service'
import { getAggregate } from '@/lib/cv/service'
import { deriveSelection, selectionToQueryParams, selectionHashParts } from '@/lib/export/selector'
import type { Logger } from 'pino'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Narrow internal histogram contract with a minimal interface to avoid any casts
interface HistogramLike { observe: (v: number) => void }
function isHistogramLike(x: unknown): x is HistogramLike {
  return !!x && typeof (x as { observe?: unknown }).observe === 'function'
}
const observeExportSize = (n: number): void => {
  const h = exportPdfSizeBytes
  if (isHistogramLike(h)) h.observe(n)
}


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

function bufferToStream(buf: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(buf)
      controller.close()
    }
  })
}

function pdfResponseStream(buf: Uint8Array, filename: string, cache: 'HIT' | 'MISS'): NextResponse {
  const stream = bufferToStream(buf)
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'X-Cache': cache,
      // Provide length for clients that can still consume streamed body with known length
      'Content-Length': String(buf.byteLength)
    }
  })
}

async function attemptCacheHit(cacheKey: string, cfg: ExportConfigInput, logger: Logger): Promise<NextResponse | undefined> {
  try {
    const cached = await pdfCache.get(cacheKey)
    if (cached) {
      exportCacheHitTotal.inc()
      exportRequestsTotal.inc({ result: 'cache_hit' })
      const bytes = new Uint8Array(cached)
      observeExportSize(bytes.byteLength)
      logEvent(logger, 'domain:export.generate.cache_hit', { key: cacheKey })
      return pdfResponseStream(bytes, `${cfg.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-export.pdf`, 'HIT')
    }
    exportCacheMissTotal.inc()
  } catch (e: unknown) {
    logError(logger, 'domain:export.generate.cache_get_error', e instanceof Error ? e : new Error('cache_get'))
  }
  return undefined
}

async function generateAndRespond(target: string, cacheKey: string, cfg: ExportConfigInput, configName: string, logger: Logger): Promise<NextResponse> {
  const { final, person } = await generateCvPdf(target)
  try { await pdfCache.set(cacheKey, final) } catch (e: unknown) { logError(logger, 'domain:export.generate.cache_set_error', e instanceof Error ? e : new Error('cache_set')) }
  exportRequestsTotal.inc({ result: 'success' })
  exportSuccessTotal.inc()
  observeExportSize(final.byteLength)
  logEvent(logger, 'domain:export.generate.success', { bytes: final.byteLength, key: cacheKey, config: configName })
  return pdfResponseStream(new Uint8Array(final), `${person.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-export.pdf`, 'MISS')
}

function disabledResponse(logger: Logger): NextResponse {
  logEvent(logger, 'domain:export.generate.disabled')
  exportRequestsTotal.inc({ result: 'disabled' })
  return NextResponse.json({ error: 'EXPORT_DISABLED' }, { status: 501 })
}

// Auth context requires cookie store; request param unused (prefix underscore)
// (param kept for potential future per-request context needs)
async function authContext(__unused: NextRequest): Promise<ReturnType<typeof requireAdmin>> {
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  return requireAdmin(ctx)
}

async function parseBody(_req: NextRequest): Promise<unknown> {
  try { return await _req.json() } catch { return {} }
}

async function resolveConfig(prisma: PrismaClient, body: unknown, logger: Logger) {
  const loaded = await loadConfig(prisma, body, logger)
  if ('error' in loaded) {
    exportRequestsTotal.inc({ result: loaded.error === 'CONFIG_NOT_FOUND' ? 'config_not_found' : 'invalid' })
  }
  return loaded
}

function buildCacheKey(cfg: ExportConfigInput, selectionHash: string[]): string {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(cfg))
    .update('|')
    .update(selectionHash.join('|'))
    .digest('hex')
    .slice(0, 16)
  return `export:${hash}`
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const logger = withRequestContext(_req)
  if (!FEATURE_EXPORT_ENABLED) return disabledResponse(logger)

  const auth = await authContext(_req)
  if (!auth.ok) {
    logEvent(logger, 'domain:export.generate.auth_failed')
    exportRequestsTotal.inc({ result: 'unauthorized' })
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const body = await parseBody(_req)
  // Use shared Prisma instance to avoid value import errors and multiple clients.
  const { getPrisma } = await import('@/lib/cv/service')
  const prisma = getPrisma()
  const loaded = await resolveConfig(prisma, body, logger)
  if ('error' in loaded) { return NextResponse.json(loaded, { status: loaded.error === 'CONFIG_NOT_FOUND' ? 404 : 400 }) }
  const cfg = loaded.cfg
  const configName = loaded.name

  // Selection derive timing
  const selectionTimerEnd: ((additional?: Record<string,string>)=>void) | undefined =
    exportSelectionDeriveDurationSeconds.startTimer
      ? exportSelectionDeriveDurationSeconds.startTimer({ result: 'pending' })
      : undefined
  // Be explicit to keep ESLint from inferring any in complex destructures
  const aggregateResult = await getAggregate('en')
  const agg = aggregateResult.data
  // Capture before/after counts to detect pruning
  type SectionCounts = { skills: number; projects: number; experiences: number; education: number }
  const before: SectionCounts = {
    skills: agg.skills.length,
    projects: agg.projects.length,
    experiences: (agg.experiences ?? []).length,
    education: (agg.education ?? []).length,
  }
  const selection = deriveSelection(cfg, agg)
  const after: SectionCounts = {
    skills: selection.skills.length,
    projects: selection.projects.length,
    experiences: selection.experiences.length,
    education: selection.education?.length ?? 0,
  }
  selectionTimerEnd?.({ result: 'ok' })
  const target = await buildTargetUrl(cfg, selectionToQueryParams(cfg, selection))
  logEvent(logger, 'domain:export.generate.selection_computed', { targetQuery: target.split('?')[1] || '', skills: selection.skills.length, projects: selection.projects.length, experiences: selection.experiences.length })
  // Telemetry: emit when any section was pruned by filters/limits
  if (after.skills < before.skills || after.projects < before.projects || after.experiences < before.experiences || after.education < before.education) {
    const filtered: SectionCounts = {
      skills: Math.max(0, before.skills - after.skills),
      projects: Math.max(0, before.projects - after.projects),
      experiences: Math.max(0, before.experiences - after.experiences),
      education: Math.max(0, before.education - after.education),
    }
    logEvent(logger, 'domain:export_section_filtered', { before, after, filtered })
  }

  const cacheKey = buildCacheKey(cfg, selectionHashParts(selection))
  const cachedResponse = await attemptCacheHit(cacheKey, cfg, logger)
  if (cachedResponse) { return cachedResponse }

  const endTotal: ((additional?: Record<string,string>)=>void) | undefined =
    exportDurationSeconds.startTimer
      ? exportDurationSeconds.startTimer({ result: 'pending' })
      : undefined
  try {
    const resp = await generateAndRespond(target, cacheKey, cfg, configName, logger)
  endTotal?.({ result: 'success' })
    return resp
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error('export_failed')
    exportRequestsTotal.inc({ result: 'error' })
    exportFailureTotal.inc({ reason: err.name || 'Error' })
  endTotal?.({ result: 'error' })
    logError(logger, 'domain:export.generate.error', err)
    return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: err.message === 'no_chromium' ? 501 : 500 })
  }
}

