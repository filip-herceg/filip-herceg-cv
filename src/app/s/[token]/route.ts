import { NextRequest, NextResponse } from 'next/server'
import { getPrisma, canUseDatabase } from '@/lib/cv/service'
import { verifyShareToken } from '@/lib/share-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Next.js 15 types expect the RouteContext.params to be a Promise
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const secret = process.env.SHARE_TOKEN_SECRET || (process.env.NODE_ENV !== 'production' ? 'devsecret' : '')
  const verified = verifyShareToken(token, secret)
  if (!verified) return NextResponse.json({ error: 'invalid_or_expired' }, { status: 400 })
  // Dev: allow redirect purely from token when DB is not available
  if (!canUseDatabase() && process.env.NODE_ENV !== 'production') {
    const base = req.headers.get('x-forwarded-proto') + '://' + (req.headers.get('x-forwarded-host') || req.headers.get('host'))
    const target = new URL('/cv/print', base)
    target.searchParams.set('presetId', verified.presetId)
    return NextResponse.redirect(target.toString(), 302)
  }
  const prisma = getPrisma()
  const rec = await prisma.shareToken.findUnique({ where: { id: verified.id } })
  if (!rec) return NextResponse.json({ error: 'revoked' }, { status: 410 })

  const base = req.headers.get('x-forwarded-proto') + '://' + (req.headers.get('x-forwarded-host') || req.headers.get('host'))
  const target = new URL('/cv/print', base)
  // scope supports latest_preset_export → we pass presetId; the print route should derive correct default selection by preset
  target.searchParams.set('presetId', rec.presetId)
  return NextResponse.redirect(target.toString(), 302)
}
