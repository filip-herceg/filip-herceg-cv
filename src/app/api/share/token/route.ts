import { NextRequest, NextResponse } from 'next/server'
import { getPrisma, canUseDatabase } from '@/lib/cv/service'
import { signShareToken } from '@/lib/share-token'
import crypto from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const usingDb = canUseDatabase()
  const prisma = usingDb ? getPrisma() : null
  const body = (await req.json().catch(() => ({}))) as { presetId?: string; ttlSeconds?: number }
  const presetId = body.presetId?.trim()
  if (!presetId) return NextResponse.json({ error: 'presetId required' }, { status: 400 })
  const ttl = Math.max(60, Math.min(60 * 60 * 24 * 30, Number(body.ttlSeconds ?? 60 * 60 * 24)))
  const exp = new Date(Date.now() + ttl * 1000)
  const secret = process.env.SHARE_TOKEN_SECRET || (process.env.NODE_ENV !== 'production' ? 'devsecret' : '')
  if (!secret) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  if (usingDb && prisma) {
    const record = await prisma.shareToken.create({ data: { presetId, expiresAt: exp } })
    const token = signShareToken({ id: record.id, presetId, exp: Math.floor(exp.getTime() / 1000), scope: 'latest_preset_export' }, secret)
    return NextResponse.json({ token, id: record.id, expiresAt: exp.toISOString() })
  }
  // Dev fallback for local smoke when DB isn’t configured
  if (process.env.NODE_ENV !== 'production') {
    const id = crypto.randomUUID()
    const token = signShareToken({ id, presetId, exp: Math.floor(exp.getTime() / 1000), scope: 'latest_preset_export' }, secret)
    return NextResponse.json({ token, id, expiresAt: exp.toISOString(), note: 'dev-fallback, not stored in DB' })
  }
  return NextResponse.json({ error: 'unavailable' }, { status: 503 })
}
