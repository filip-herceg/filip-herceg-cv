'use client'
import { Section } from '@/components/ui/section'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { localizedMeta, localeFromHeaders, t } from '@/lib/i18n'

export const dynamic = 'error'
export async function generateMetadata() {
  const locale = localeFromHeaders()
  return localizedMeta(locale, 'contact', { path: 'contact' })
}

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const locale = 'en'
  const heading = t(locale, 'contact.heading')
  const nameLabel = t(locale, 'contact.name')
  const emailLabel = t(locale, 'contact.email')
  const messageLabel = t(locale, 'contact.message')
  const sendCta = t(locale, 'contact.send')
  const sendingCta = t(locale, 'contact.sending')
  const sentCta = t(locale, 'contact.sent')
  const errorMsg = t(locale, 'contact.error')
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
  <h1 className="text-3xl font-bold mb-6">{heading}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm mb-1">
              {nameLabel}
            </label>
            <Input id="contact-name" name="name" required />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm mb-1">
              {emailLabel}
            </label>
            <Input id="contact-email" type="email" name="email" required />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-sm mb-1">
              {messageLabel}
            </label>
            <Textarea id="contact-message" name="message" required rows={5} />
          </div>
          <Button disabled={status === 'sending' || status === 'sent'} type="submit">
            {status === 'sent' ? sentCta : status === 'sending' ? sendingCta : sendCta}
          </Button>
          {status === 'error' && <p className="text-sm text-destructive">{errorMsg}</p>}
        </form>
      </Section>
    </main>
  )
}
