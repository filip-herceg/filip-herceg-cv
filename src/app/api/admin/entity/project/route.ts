// Coverage enabled (tests exercise branches)
// Admin Project CRUD route (POST upsert, DELETE).
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { ProjectSchema } from '@/lib/cv/schema'
import { PrismaClient } from '@prisma/client'
import { invalidateAggregateCache } from '@/lib/cv/service'
import { cvEntityMutationsTotal } from '@/lib/metrics'

// Extend with locale which is stored in composite PK
const CreateProjectSchema = ProjectSchema.extend({ locale: z.string().min(2) })

export async function POST(req: Request) {
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const body = await parse(req)
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 })
  const prisma = new PrismaClient()
  try {
    const existing = await prisma.project.findUnique({ where: { id_locale: { id: parsed.data.id, locale: parsed.data.locale } } })
  const upd: Record<string, unknown> = { title: parsed.data.title, role: parsed.data.role, period: parsed.data.period, company: parsed.data.company, summary: parsed.data.summary, impact: parsed.data.impact }
    if (parsed.data.highlights?.length) upd.highlightsJson = JSON.stringify(parsed.data.highlights)
    if (parsed.data.stack?.length) upd.stackJson = JSON.stringify(parsed.data.stack)
    if (parsed.data.links?.length) upd.linksJson = JSON.stringify(parsed.data.links)
  const crt = { id: parsed.data.id, locale: parsed.data.locale, title: parsed.data.title, role: parsed.data.role, period: parsed.data.period, company: parsed.data.company, summary: parsed.data.summary, impact: parsed.data.impact, ...(parsed.data.highlights?.length ? { highlightsJson: JSON.stringify(parsed.data.highlights) } : {}), ...(parsed.data.stack?.length ? { stackJson: JSON.stringify(parsed.data.stack) } : {}), ...(parsed.data.links?.length ? { linksJson: JSON.stringify(parsed.data.links) } : {}) }
    await prisma.project.upsert({ where: { id_locale: { id: parsed.data.id, locale: parsed.data.locale } }, update: upd, create: crt })
    cvEntityMutationsTotal.inc({ entity: 'project', action: existing ? 'update' : 'create', result: 'success' })
    invalidateAggregateCache(parsed.data.locale)
    return NextResponse.json({ result: 'ok' })
  } catch {
    cvEntityMutationsTotal.inc({ entity: 'project', action: 'create', result: 'error' })
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const locale = url.searchParams.get('locale') || 'en'
  if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
  const prisma = new PrismaClient()
  try {
    await prisma.project.delete({ where: { id_locale: { id, locale } } })
    cvEntityMutationsTotal.inc({ entity: 'project', action: 'delete', result: 'success' })
    invalidateAggregateCache(locale)
    return NextResponse.json({ result: 'deleted' })
  } catch {
    cvEntityMutationsTotal.inc({ entity: 'project', action: 'delete', result: 'error' })
    return NextResponse.json({ result: 'deleted' })
  }
}

async function parse(req: Request) { try { return await req.json() } catch { return {} } }
// end project admin route
