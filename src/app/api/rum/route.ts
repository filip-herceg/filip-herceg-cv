import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // TODO: send to analytics backend
    console.log('web-vitals', body)
  } catch {}
  return NextResponse.json({ ok: true })
}
