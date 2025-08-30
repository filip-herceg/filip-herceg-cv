// coverage enabled: skill route (first to remove ignore)
// Admin Skill CRUD route (POST upsert, DELETE).
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { SkillSchema } from '@/lib/cv/schema'
import { PrismaClient } from '@prisma/client'
import { invalidateAggregateCache } from '@/lib/cv/service'
import { cvEntityMutationsTotal } from '@/lib/metrics'
import { upsertSkill, deleteSkill } from '@/lib/admin/skill-handler'
import { withRequestContext, logEvent, logError } from '@/lib/logger'

const CreateSkillSchema = SkillSchema.extend({ locale: z.string().min(2) })

export async function POST(req: Request) {
  const reqLogger = withRequestContext(req)
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) {
    logEvent(reqLogger, 'domain:admin.skill.auth_failed')
    return NextResponse.json(auth.body, { status: auth.status })
  }
  const body = await parse(req)
  const parsed = CreateSkillSchema.safeParse(body)
  if (!parsed.success) {
    logEvent(reqLogger, 'domain:admin.skill.validation_failed', { issues: parsed.error.issues.length })
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 })
  }
  const prisma = new PrismaClient()
  try {
    const { action } = await upsertSkill(prisma, parsed.data)
    cvEntityMutationsTotal.inc({ entity: 'skill', action, result: 'success' })
    invalidateAggregateCache(parsed.data.locale)
    logEvent(reqLogger, 'domain:admin.skill.upsert_success', { action })
    return NextResponse.json({ result: 'ok', action })
  } catch (e) {
    cvEntityMutationsTotal.inc({ entity: 'skill', action: 'create', result: 'error' })
    logError(reqLogger, 'domain:admin.skill.upsert_error', e)
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const reqLogger = withRequestContext(req)
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) {
    logEvent(reqLogger, 'domain:admin.skill.auth_failed')
    return NextResponse.json(auth.body, { status: auth.status })
  }
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const locale = url.searchParams.get('locale') || 'en'
  if (!id) {
    logEvent(reqLogger, 'domain:admin.skill.missing_id')
    return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
  }
  const prisma = new PrismaClient()
  try {
    await deleteSkill(prisma, id, locale)
    cvEntityMutationsTotal.inc({ entity: 'skill', action: 'delete', result: 'success' })
    invalidateAggregateCache(locale)
    logEvent(reqLogger, 'domain:admin.skill.delete_success')
    return NextResponse.json({ result: 'deleted' })
  } catch (e) {
    cvEntityMutationsTotal.inc({ entity: 'skill', action: 'delete', result: 'error' })
    logError(reqLogger, 'domain:admin.skill.delete_error', e, { id })
    // still 200? choose 500 to surface issue (observability + client clarity)
    return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 })
  }
}

async function parse(req: Request) { try { return await req.json() } catch { return {} } }
// end skill route
