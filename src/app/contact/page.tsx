'use client'
import { Section } from '@/components/ui/section'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { localizedMeta } from '@/lib/i18n'
import { headers } from 'next/headers'

export const dynamic = 'error'
export async function generateMetadata() {
  const h = headers()
  const path = h.get('x-pathname') || ''
  const seg = path.split('/').filter(Boolean)[0]
  const locale = ['de'].includes(seg) ? seg : 'en'
  return localizedMeta(locale, 'contact', { path: 'contact' })
}

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = Object.fromEntries(new FormData(form).entries())
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) setStatus('sent')
      else throw new Error('Failed')
    } catch {
      setStatus('error')
    }
  }
  return (
    <main>
      <Section className="pt-24 max-w-xl">
        <h1 className="text-3xl font-bold mb-6">Contact</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm mb-1">
              Name
            </label>
            <Input id="contact-name" name="name" required />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm mb-1">
              Email
            </label>
            <Input id="contact-email" type="email" name="email" required />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-sm mb-1">
              Message
            </label>
            <Textarea id="contact-message" name="message" required rows={5} />
          </div>
          <Button disabled={status === 'sending' || status === 'sent'} type="submit">
            {status === 'sent' ? 'Sent!' : status === 'sending' ? 'Sending...' : 'Send Message'}
          </Button>
          {status === 'error' && <p className="text-sm text-destructive">Something went wrong.</p>}
        </form>
      </Section>
    </main>
  )
}
