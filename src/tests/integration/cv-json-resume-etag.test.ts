import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/cv/json-resume/route'

function makeReq(url: string) { return new Request(url) }

describe('/api/cv/json-resume etag handling', () => {
  it('returns 304 when If-None-Match matches', async () => {
    const first = await GET(makeReq('http://test/api/cv/json-resume') as any)
    const etag = first.headers.get('etag') || ''
    const second = await GET(new Request('http://test/api/cv/json-resume', { headers: { 'if-none-match': etag } }) as any)
    expect(second.status).toBe(304)
  })
})
