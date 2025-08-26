import { describe, it, expect, vi } from 'vitest'

// Force POST to throw before schema parse by making req.json reject

describe('contact route exception branch', () => {
  it('returns 400 on thrown exception (logError path)', async () => {
    const { POST } = await import('@/app/api/contact/route')
    const badReq: any = { json: () => { throw new Error('boom'); } }
    const res = await POST(badReq)
    expect(res.status).toBe(400)
  })
})
