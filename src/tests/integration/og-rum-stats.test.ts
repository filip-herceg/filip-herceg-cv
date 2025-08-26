import { describe, it, expect, beforeEach } from 'vitest'
import { GET as ogGET } from '@/app/api/og/route'
import { GET as rumStatsGET } from '@/app/api/rum/stats/route'
import { POST as rumPOST } from '@/app/api/rum/route'
import { clear, record } from '@/lib/rum'

// These tests exercise the remaining untested API routes (og image & rum stats)

describe('API: og & rum stats', () => {
  beforeEach(() => clear())

  it('generates og image response', async () => {
    const res = await ogGET()
    // ImageResponse objects expose a body (ReadableStream); we just assert presence of headers like content-type
    // In edge runtime tests may not set actual content-type, so assert object shape
    expect(res).toBeInstanceOf(Response)
  })

  it('returns empty stats initially', async () => {
    const res = await rumStatsGET()
    const json = await res.json()
    expect(json).toEqual({})
  })

  it('aggregates stats after recording metrics', async () => {
    for (let i = 1; i <= 5; i++) record({ name: 'LCP', value: i })
    const res = await rumStatsGET()
    const json = await res.json()
    expect(json.lcp.count).toBe(5)
    expect(json.lcp.p50).toBeDefined()
  })

  it('rum POST rejects invalid metric payload', async () => {
    // missing value (number) -> invalid
    const res = await rumPOST(new Request('http://test/rum', { method: 'POST', body: JSON.stringify({ name: 'LCP' }) }))
    expect(res.status).toBe(400)
  })
})
