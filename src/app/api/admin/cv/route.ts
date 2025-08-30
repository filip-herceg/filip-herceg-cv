import { NextResponse } from 'next/server'
import { buildAuthContext } from '@/lib/auth/context'
import { NextCookieStore } from '@/lib/auth/cookies'
import { requireAdmin } from '@/lib/auth/guard'
import { getAggregate, invalidateAggregateCache } from '@/lib/cv/service'

export async function GET(req: Request) {
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const url = new URL(req.url)
  const locale = url.searchParams.get('locale') || 'en'
  const { data, design, source } = await getAggregate(locale)
  return NextResponse.json({ data, design, source })
}

// POST endpoint to invalidate cache manually (admin action) – optional utility
export async function POST(req: Request) {
  const store = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store })
  const auth = await requireAdmin(ctx)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const { locale } = await safeJson(req)
  invalidateAggregateCache(locale || 'en')
  return NextResponse.json({ result: 'invalidated', locale: locale || 'en' })
}

interface InvalidateBody { locale?: string }
async function safeJson(req: Request): Promise<InvalidateBody> { try { return await req.json() as InvalidateBody } catch { return {} } }
