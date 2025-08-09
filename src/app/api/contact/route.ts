import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, message } = body || {}
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    // TODO: integrate SMTP/Resend
    console.log('Contact submission', { name, email, message })
    return NextResponse.json({ received: true }, { status: 202 })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
