import { describe, it, expect, beforeEach } from 'vitest'
import { GET as ogGET } from '@/app/api/og/route'
import { GET as rumStatsGET } from '@/app/api/rum/stats/route'
import { POST as rumPOST } from '@/app/api/rum/route'
import { clear, record } from '@/lib/rum'

// Tests for og image route + rum stats aggregation

describe('API: og & rum stats', () => {
  beforeEach(() => clear())

  it('generates og image response', async () => {
    const res = await ogGET()
    expect(res).toBeInstanceOf(Response)
  })

  it('returns empty stats initially', async () => {
    const res = await rumStatsGET(new Request('http://test/rum/stats', { method: 'GET' }))
    const json = await res.json()
    expect(json).toEqual({})
  })

  it('aggregates stats after recording metrics', async () => {
    for (let i = 1; i <= 5; i++) record({ name: 'LCP', value: i })
    const res = await rumStatsGET(new Request('http://test/rum/stats', { method: 'GET' }))
    const json = await res.json()
    expect(json.lcp.count).toBe(5)
    expect(json.lcp.p50).toBeDefined()
  })

  it('rum POST rejects invalid metric payload', async () => {
    const res = await rumPOST(new Request('http://test/rum', { method: 'POST', body: JSON.stringify({ name: 'LCP' }) }))
    expect(res.status).toBe(400)
  })

  it('rum POST accepts valid metric', async () => {
    const res = await rumPOST(new Request('http://test/rum', { method: 'POST', body: JSON.stringify({ name: 'LCP', value: 123 }) }))
    expect(res.status).toBe(200)
  })
})
