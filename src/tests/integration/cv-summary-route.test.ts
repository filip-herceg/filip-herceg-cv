import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/cv/summary.txt/route'

function makeReq(url: string) { return new Request(url) }

describe('/api/cv/summary.txt route', () => {
  it('returns plain text summary', async () => {
    const res = await GET(makeReq('http://test/api/cv/summary.txt') as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/plain/)
    const text = await res.text()
    expect(text).toMatch(/Skills:/)
  })
})
