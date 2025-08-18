import { describe, it, expect } from 'vitest'
import { contactSchema } from '@/app/api/contact/schema'

describe('contact schema', () => {
  it('accepts valid data', () => {
    const parsed = contactSchema.safeParse({
      name: 'Test User',
      email: 'user@example.com',
      message: 'Hello there this is a sufficiently long message.',
    })
    expect(parsed.success).toBe(true)
  })
  it('rejects short message', () => {
    const parsed = contactSchema.safeParse({
      name: 'Test User',
      email: 'user@example.com',
      message: 'short',
    })
    expect(parsed.success).toBe(false)
  })
})
