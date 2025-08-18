import { describe, it, expect } from 'vitest'
import { GET as healthz } from '@/app/api/healthz/route'
import { POST as rum } from '@/app/api/rum/route'

describe('api routes', () => {
  it('/api/healthz returns ok', async () => {
    const res = await healthz()
    const json = await res.json()
    expect(json.status).toBe('ok')
  })
  it('/api/rum rejects bad payload', async () => {
    const res = await rum(
      new Request('http://test/rum', { method: 'POST', body: JSON.stringify({ bad: true }) }),
    )
    expect(res.status).toBe(400)
  })
  it('/api/rum accepts valid metric', async () => {
    const res = await rum(
      new Request('http://test/rum', {
        method: 'POST',
        body: JSON.stringify({ name: 'CLS', value: 0.01 }),
      }),
    )
    const json = await res.json()
    expect(json.ok).toBe(true)
  })
})
