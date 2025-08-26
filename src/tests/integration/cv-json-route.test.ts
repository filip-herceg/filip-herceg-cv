import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/cv/json/route'
import { encodePreset } from '@/lib/cv/permalink'

function makeReq(url: string) {
  return new Request(url)
}

describe('/api/cv/json route', () => {
  it('returns canonical JSON with caching headers', async () => {
  const res = await GET(makeReq('http://test/api/cv/json') as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
    const etag = res.headers.get('etag')
    expect(etag).toMatch(/cv-/)
    const json = await res.json()
    expect(json.version).toBe(1)
  })
  it('applies cv token selection', async () => {
    const token = await encodePreset({ skills: ['ts'], projects: ['obs-platform'], mode: 'short' })
  const res = await GET(makeReq('http://test/api/cv/json?cv=' + token) as any)
    const json = await res.json()
    expect(json.selection.skills).toEqual(['ts'])
    expect(json.skills.length).toBe(1)
  })
  it('redacts email in public mode', async () => {
  const res = await GET(makeReq('http://test/api/cv/json?public=1') as any)
    const json = await res.json()
    expect(json.person.contact.email).toBeUndefined()
    expect(json.redactions).toContain('person.contact.email')
  })
  it('returns 304 when If-None-Match matches', async () => {
  const first = await GET(makeReq('http://test/api/cv/json') as any)
    const etag = first.headers.get('etag') || ''
  const second = await GET(new Request('http://test/api/cv/json', { headers: { 'if-none-match': etag } }) as any)
    expect(second.status).toBe(304)
  })
})
