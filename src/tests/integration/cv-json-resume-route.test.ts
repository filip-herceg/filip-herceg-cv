import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/cv/json-resume/route'

function makeReq(url: string) { return new Request(url) }

describe('/api/cv/json-resume route', () => {
  it('returns json resume document', async () => {
    const res = await GET(makeReq('http://test/api/cv/json-resume') as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
    const json = await res.json()
    expect(json.basics.name).toBeDefined()
  })
  it('redacts email in public mode', async () => {
    const res = await GET(makeReq('http://test/api/cv/json-resume?public=1') as any)
    const json = await res.json()
    expect(json.basics.email).toBeUndefined()
  })
})
