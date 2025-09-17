// Coverage enabled (tests exercise branches)
// Admin Experience CRUD route (POST upsert, DELETE).
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { ExperienceSchema } from '@/lib/cv/schema'
import { getPrisma, invalidateAggregateCache } from '@/lib/cv/service'
import { cvEntityMutationsTotal } from '@/lib/metrics'

const CreateExperienceSchema = ExperienceSchema.extend({ locale: z.string().min(2) })

export async function POST(req: Request) {
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const body = await parse(req)
  const parsed = CreateExperienceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 })
  const prisma = getPrisma()
  try {
    const key = { id: parsed.data.id, locale: parsed.data.locale }
    const existing = await prisma.experience.findUnique({ where: { id_locale: key } })
  const upd: Record<string, unknown> = { company: parsed.data.company, role: parsed.data.role, period: parsed.data.period, location: parsed.data.location, employmentType: parsed.data.employmentType, summary: parsed.data.summary }
    if (parsed.data.achievements?.length) upd.achievementsJson = JSON.stringify(parsed.data.achievements)
    if (parsed.data.stack?.length) upd.stackJson = JSON.stringify(parsed.data.stack)
    if (parsed.data.tags?.length) upd.tagsJson = JSON.stringify(parsed.data.tags)
  const crt = { id: parsed.data.id, locale: parsed.data.locale, company: parsed.data.company, role: parsed.data.role, period: parsed.data.period, location: parsed.data.location, employmentType: parsed.data.employmentType, summary: parsed.data.summary, ...(parsed.data.achievements?.length ? { achievementsJson: JSON.stringify(parsed.data.achievements) } : {}), ...(parsed.data.stack?.length ? { stackJson: JSON.stringify(parsed.data.stack) } : {}), ...(parsed.data.tags?.length ? { tagsJson: JSON.stringify(parsed.data.tags) } : {}) }
    await prisma.experience.upsert({ where: { id_locale: key }, update: upd, create: crt })
    cvEntityMutationsTotal.inc({ entity: 'experience', action: existing ? 'update' : 'create', result: 'success' })
    invalidateAggregateCache(parsed.data.locale)
    return NextResponse.json({ result: 'ok' })
  } catch {
    cvEntityMutationsTotal.inc({ entity: 'experience', action: 'create', result: 'error' })
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
  const prisma = getPrisma()
  try {
    await prisma.experience.delete({ where: { id_locale: { id, locale } } })
    cvEntityMutationsTotal.inc({ entity: 'experience', action: 'delete', result: 'success' })
    invalidateAggregateCache(locale)
    return NextResponse.json({ result: 'deleted' })
  } catch {
    cvEntityMutationsTotal.inc({ entity: 'experience', action: 'delete', result: 'error' })
    return NextResponse.json({ result: 'deleted' })
  }
}

async function parse(req: Request) { try { return await req.json() } catch { return {} } }
// end experience admin route