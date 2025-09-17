// coverage enabled: removed temporary c8 ignore
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { TraitSchema } from '@/lib/cv/schema'
import { getPrisma, invalidateAggregateCache } from '@/lib/cv/service'
import { cvEntityMutationsTotal } from '@/lib/metrics'

const CreateTraitSchema = TraitSchema.extend({ locale: z.string().min(2) })

export async function POST(req: Request) {
  const store = await new (NextCookieStore)().init(); const ctx = buildAuthContext({ store }); const auth = await requireAdmin(ctx)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const body = await parse(req); const parsed = CreateTraitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 })
  const prisma = getPrisma()
  try {
    const key = { id: parsed.data.id, locale: parsed.data.locale }
    const existing = await prisma.trait.findUnique({ where: { id_locale: key } })
    await prisma.trait.upsert({
      where: { id_locale: key },
      update: { name: parsed.data.name, description: parsed.data.description, category: parsed.data.category },
      create: { id: parsed.data.id, locale: parsed.data.locale, name: parsed.data.name, description: parsed.data.description, category: parsed.data.category },
    })
    cvEntityMutationsTotal.inc({ entity: 'trait', action: existing ? 'update' : 'create', result: 'success' })
    invalidateAggregateCache(parsed.data.locale)
    return NextResponse.json({ result: 'ok' })
  } catch {
    cvEntityMutationsTotal.inc({ entity: 'trait', action: 'create', result: 'error' })
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const store = await new (NextCookieStore)().init(); const ctx = buildAuthContext({ store }); const auth = await requireAdmin(ctx)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const url = new URL(req.url); const id = url.searchParams.get('id'); const locale = url.searchParams.get('locale') || 'en'
  if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
  const prisma = getPrisma()
  try { await prisma.trait.delete({ where: { id_locale: { id, locale } } }); cvEntityMutationsTotal.inc({ entity: 'trait', action: 'delete', result: 'success' }); invalidateAggregateCache(locale); return NextResponse.json({ result: 'deleted' }) }
  catch { cvEntityMutationsTotal.inc({ entity: 'trait', action: 'delete', result: 'error' }); return NextResponse.json({ result: 'deleted' }) }
}

async function parse(req: Request) { try { return await req.json() } catch { return {} } }