import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/cv/summary.txt/route'

function makeReq(url: string) { return new Request(url) }

describe('/api/cv/summary.txt etag handling', () => {
  it('returns 304 when If-None-Match matches', async () => {
    const first = await GET(makeReq('http://test/api/cv/summary.txt') as any)
    const etag = first.headers.get('etag') || ''
    const second = await GET(new Request('http://test/api/cv/summary.txt', { headers: { 'if-none-match': etag } }) as any)
    expect(second.status).toBe(304)
  })
})
