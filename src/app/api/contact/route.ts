import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { Resend } from 'resend'
import { contactSchema } from './schema'

async function sendEmail(data: z.infer<typeof contactSchema>) {
  const apiKey = process.env.CONTACT_PROVIDER_API_KEY
  const from = process.env.CONTACT_FROM_ADDRESS
  const to = process.env.CONTACT_TO_ADDRESS
  if (!apiKey || !from || !to) {
    logger.warn({ event: 'contact.send.fallback', reason: 'missing_env' })
    return { id: 'fallback', accepted: false, error: 'Email not configured' }
  }
  try {
    const resend = new Resend(apiKey)
    const { data: result, error } = await resend.emails.send({
      from,
      to: [to],
      subject: `Portfolio contact from ${data.name}`,
      replyTo: data.email,
      text: data.message,
    })
    if (error) {
      logger.error({ event: 'contact.send.error', error })
      return { id: 'error', accepted: false, error }
    }
    logger.info({ event: 'contact.send.success', id: result?.id })
    return { id: result?.id || 'unknown', accepted: true }
  } catch (e) {
    logger.error({ event: 'contact.send.exception', err: e })
    return { id: 'exception', accepted: false, error: 'Exception' }
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = contactSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      )
    }
    const result = await sendEmail(parsed.data)
    return NextResponse.json({ received: true, result }, { status: result.accepted ? 202 : 503 })
  } catch (e) {
    logger.error({ err: e, event: 'contact.error' })
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
