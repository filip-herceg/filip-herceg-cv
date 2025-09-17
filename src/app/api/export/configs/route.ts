// NextResponse not used when returning plain Response
import { FEATURE_EXPORT_ENABLED } from '@/lib/constants'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { getPrisma } from '@/lib/cv/service'
import { ExportConfigRepository } from '@/lib/export/service'
import { ExportConfigInputSchema } from '@/lib/export/schema'
import { withRequestContext, logEvent, logError } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AuthCheck = { logger: ReturnType<typeof withRequestContext> } | { res: Response }
async function authCheck(req: Request): Promise<AuthCheck> {
  const ctxLogger = withRequestContext(req)
  if (!FEATURE_EXPORT_ENABLED) {
    logEvent(ctxLogger, 'domain:export.configs.disabled')
  return { res: new Response(JSON.stringify({ error: 'EXPORT_DISABLED' }), { status: 501, headers: { 'content-type': 'application/json' } }) }
  }
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) {
    logEvent(ctxLogger, 'domain:export.configs.auth_failed')
  return { res: new Response(JSON.stringify(auth.body), { status: auth.status, headers: { 'content-type': 'application/json' } }) }
  }
  return { logger: ctxLogger }
}

export async function GET(req: Request): Promise<Response> {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  try {
  const repo = new ExportConfigRepository(getPrisma())
    const rows = await repo.list()
    logEvent(auth.logger, 'domain:export.configs.list_success', { count: rows.length })
    return new Response(JSON.stringify({ configs: rows }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.list_error', e as Error)
    return new Response(JSON.stringify({ error: 'LIST_FAILED' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}

export async function POST(req: Request): Promise<Response> {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  let body: unknown
  try { body = await req.json() } catch { body = {} }
  const parsed = ExportConfigInputSchema.safeParse(body)
  if (!parsed.success) {
    logEvent(auth.logger, 'domain:export.configs.validation_failed', { issues: parsed.error.issues.length })
    return new Response(JSON.stringify({ error: 'VALIDATION', issues: parsed.error.issues }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  try {
  const repo = new ExportConfigRepository(getPrisma())
    const row = await repo.create(parsed.data)
    logEvent(auth.logger, 'domain:export.configs.create_success', { id: row.id })
    // Telemetry: record when a preset-backed config is applied/created
    if (parsed.data.presetType) {
      logEvent(auth.logger, 'domain:export_config_applied', {
        preset: parsed.data.presetType,
        sections: parsed.data.sections?.length ?? 0,
      })
    }
  return new Response(JSON.stringify({ config: row }), { status: 201, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.create_error', e as Error)
  return new Response(JSON.stringify({ error: 'CREATE_FAILED' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}

// Update existing config (optimistic concurrency via version field)
export async function PUT(req: Request): Promise<Response> {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  let body: unknown
  try { body = await req.json() } catch { body = {} }
  // Expect body: { id, version, config }
  interface UpdateBody { id?: string; version?: number; config?: unknown }
  const b = body as UpdateBody
  if (!b.id || typeof b.version !== 'number' || typeof b.config !== 'object' || b.config === null) {
    logEvent(auth.logger, 'domain:export.configs.update.invalid')
  return new Response(JSON.stringify({ error: 'INVALID_UPDATE_SHAPE' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  const cfgParsed = ExportConfigInputSchema.safeParse(b.config)
  if (!cfgParsed.success) {
    logEvent(auth.logger, 'domain:export.configs.update.validation_failed', { issues: cfgParsed.error.issues.length })
  return new Response(JSON.stringify({ error: 'VALIDATION', issues: cfgParsed.error.issues }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  try {
  const repo = new ExportConfigRepository(getPrisma())
    const res = await repo.update(b.id, b.version, cfgParsed.data)
    if (res === 'NOT_FOUND') {
      return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404, headers: { 'content-type': 'application/json' } })
    }
    if (res === 'VERSION_CONFLICT') {
      return new Response(JSON.stringify({ error: 'VERSION_CONFLICT' }), { status: 409, headers: { 'content-type': 'application/json' } })
    }
    logEvent(auth.logger, 'domain:export.configs.update_success', { id: res.id })
    return new Response(JSON.stringify({ config: res }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.update_error', e as Error)
  return new Response(JSON.stringify({ error: 'UPDATE_FAILED' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}

// Delete config by id
export async function DELETE(req: Request): Promise<Response> {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  let body: unknown
  try { body = await req.json() } catch { body = {} }
  const id = (body as { id?: string }).id
  if (!id) {
    logEvent(auth.logger, 'domain:export.configs.delete.invalid')
    return new Response(JSON.stringify({ error: 'INVALID_DELETE_SHAPE' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  try {
  const repo = new ExportConfigRepository(getPrisma())
    const ok = await repo.remove(id)
    if (!ok) return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404, headers: { 'content-type': 'application/json' } })
    logEvent(auth.logger, 'domain:export.configs.delete_success', { id })
    return new Response(JSON.stringify({ removed: true }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.delete_error', e as Error)
    return new Response(JSON.stringify({ error: 'DELETE_FAILED' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}
