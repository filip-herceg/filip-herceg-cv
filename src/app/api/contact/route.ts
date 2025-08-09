import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
})

async function sendEmailStub(data: z.infer<typeof contactSchema>) {
  // Placeholder for real provider integration (Resend / SES / SendGrid)
  logger.info({ event: 'contact.send.stub', ...data })
  return { id: 'stub', accepted: true }
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = contactSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
    }
    const result = await sendEmailStub(parsed.data)
    return NextResponse.json({ received: true, result }, { status: 202 })
  } catch (e) {
    logger.error({ err: e, event: 'contact.error' })
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
