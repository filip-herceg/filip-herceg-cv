import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/cv/skills.csv/route'
import { encodePreset } from '@/lib/cv/permalink'

function makeReq(url: string) { return new Request(url) }

describe('/api/cv/skills.csv route', () => {
  it('returns CSV with header', async () => {
    const res = await GET(makeReq('http://test/api/cv/skills.csv') as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/csv/)
    const text = await res.text()
    expect(text.split('\n')[0]).toBe('id,name,category,level,years')
  })
  it('applies selection via token (skill filter)', async () => {
    const token = await encodePreset({ skills: ['ts'], projects: ['obs-platform'], mode: 'short' })
    const res = await GET(makeReq('http://test/api/cv/skills.csv?cv=' + token) as any)
    const text = await res.text()
    const lines = text.trim().split('\n')
    expect(lines.length).toBe(2) // header + one skill
    expect(text).toMatch(/"ts"/) // id field
  })
  it('returns 304 with matching etag', async () => {
    const first = await GET(makeReq('http://test/api/cv/skills.csv') as any)
    const etag = first.headers.get('etag') || ''
    const second = await GET(new Request('http://test/api/cv/skills.csv', { headers: { 'if-none-match': etag } }) as any)
    expect(second.status).toBe(304)
  })
})
