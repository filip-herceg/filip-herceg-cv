import { NextResponse } from 'next/server'
import { handleLogin } from '@/lib/auth/handlers'
import { NextCookieStore } from '@/lib/auth/cookies'
import { buildAuthContext } from '@/lib/auth/context'
import type { HandlerResult } from '@/lib/auth/types'

export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const cookieStore = await new (NextCookieStore)().init()
  const ctx = buildAuthContext({ store: cookieStore })
  const result = await handleLogin({ username: parsed.username as string | undefined, password: parsed.password as string | undefined }, ctx)
  const res = NextResponse.json(result.body, { status: result.status })
  applyCookieInstructions(res, result)
  return res
}

function applyCookieInstructions(res: NextResponse, result: HandlerResult) {
  if (result.cookies?.set) for (const c of result.cookies.set) res.cookies.set(c.name, c.value, c.options)
  if (result.cookies?.delete) for (const d of result.cookies.delete) {
    if (d.options) res.cookies.delete({ name: d.name, ...d.options })
    else res.cookies.delete(d.name)
  }
}
