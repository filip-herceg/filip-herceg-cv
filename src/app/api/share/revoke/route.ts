import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma, canUseDatabase } from '@/lib/cv/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!canUseDatabase()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
  const prisma = getPrisma()
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await prisma.shareToken.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: 'failed', message: msg }, { status: 500 })
  }
}
