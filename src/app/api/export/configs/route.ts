import { NextResponse } from 'next/server'
import { FEATURE_EXPORT_ENABLED } from '@/lib/constants'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { PrismaClient } from '@prisma/client'
import { ExportConfigRepository } from '@/lib/export/service'
import { ExportConfigInputSchema } from '@/lib/export/schema'
import { withRequestContext, logEvent, logError } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authCheck(req: Request) {
  const ctxLogger = withRequestContext(req)
  if (!FEATURE_EXPORT_ENABLED) {
    logEvent(ctxLogger, 'domain:export.configs.disabled')
    return { res: NextResponse.json({ error: 'EXPORT_DISABLED' }, { status: 501 }) }
  }
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) {
    logEvent(ctxLogger, 'domain:export.configs.auth_failed')
    return { res: NextResponse.json(auth.body, { status: auth.status }) }
  }
  return { logger: ctxLogger }
}

export async function GET(req: Request) {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  try {
    const repo = new ExportConfigRepository(new PrismaClient())
    const rows = await repo.list()
    logEvent(auth.logger, 'domain:export.configs.list_success', { count: rows.length })
    return NextResponse.json({ configs: rows })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.list_error', e as Error)
    return NextResponse.json({ error: 'LIST_FAILED' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  let body: unknown
  try { body = await req.json() } catch { body = {} }
  const parsed = ExportConfigInputSchema.safeParse(body)
  if (!parsed.success) {
    logEvent(auth.logger, 'domain:export.configs.validation_failed', { issues: parsed.error.issues.length })
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 })
  }
  try {
    const repo = new ExportConfigRepository(new PrismaClient())
    const row = await repo.create(parsed.data)
    logEvent(auth.logger, 'domain:export.configs.create_success', { id: row.id })
    return NextResponse.json({ config: row }, { status: 201 })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.create_error', e as Error)
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 })
  }
}

// Update existing config (optimistic concurrency via version field)
export async function PUT(req: Request) {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  let body: unknown
  try { body = await req.json() } catch { body = {} }
  // Expect body: { id, version, config }
  interface UpdateBody { id?: string; version?: number; config?: unknown }
  const b = body as UpdateBody
  if (!b.id || typeof b.version !== 'number' || typeof b.config !== 'object' || b.config === null) {
    logEvent(auth.logger, 'domain:export.configs.update.invalid')
    return NextResponse.json({ error: 'INVALID_UPDATE_SHAPE' }, { status: 400 })
  }
  const cfgParsed = ExportConfigInputSchema.safeParse(b.config)
  if (!cfgParsed.success) {
    logEvent(auth.logger, 'domain:export.configs.update.validation_failed', { issues: cfgParsed.error.issues.length })
    return NextResponse.json({ error: 'VALIDATION', issues: cfgParsed.error.issues }, { status: 400 })
  }
  try {
    const repo = new ExportConfigRepository(new PrismaClient())
    const res = await repo.update(b.id, b.version, cfgParsed.data)
    if (res === 'NOT_FOUND') return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    if (res === 'VERSION_CONFLICT') return NextResponse.json({ error: 'VERSION_CONFLICT' }, { status: 409 })
    logEvent(auth.logger, 'domain:export.configs.update_success', { id: res.id })
    return NextResponse.json({ config: res })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.update_error', e as Error)
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
  }
}

// Delete config by id
export async function DELETE(req: Request) {
  const auth = await authCheck(req)
  if ('res' in auth) return auth.res
  let body: unknown
  try { body = await req.json() } catch { body = {} }
  const id = (body as { id?: string }).id
  if (!id) {
    logEvent(auth.logger, 'domain:export.configs.delete.invalid')
    return NextResponse.json({ error: 'INVALID_DELETE_SHAPE' }, { status: 400 })
  }
  try {
    const repo = new ExportConfigRepository(new PrismaClient())
    const ok = await repo.remove(id)
    if (!ok) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    logEvent(auth.logger, 'domain:export.configs.delete_success', { id })
    return NextResponse.json({ removed: true })
  } catch (e) {
    logError(auth.logger, 'domain:export.configs.delete_error', e as Error)
    return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 })
  }
}
