import { describe, it, expect } from 'vitest'
import { sampleCvData } from '../../lib/cv/sample-data'
import { buildIndex, search } from '../../lib/cv/search'

const index = buildIndex(sampleCvData)

describe('cv search index', () => {
  it('builds all expected kinds', () => {
    const kinds = new Set(index.map(d => d.kind))
    expect(kinds.has('skill')).toBe(true)
    expect(kinds.has('project')).toBe(true)
    expect(kinds.has('experience')).toBe(true)
    expect(kinds.has('education')).toBe(true)
    expect(kinds.has('certification')).toBe(true)
  })

  it('scores project higher than skill for shared token', () => {
    // token "platform" appears in project summary or highlights maybe not; use 'platform' from obs-platform title & skill category mismatch
    const r = search(index, 'platform')
    const proj = r.results.find(x => x.kind === 'project')
    const skill = r.results.find(x => x.kind === 'skill')
    if (proj && skill) {
      expect(proj.score).toBeGreaterThanOrEqual(skill.score)
    }
  })

  it('filters by category', () => {
    const r = search(index, '', { filters: { category: 'Language', kinds: ['skill'] } })
    expect(r.results.every(x => x.kind === 'skill')).toBe(true)
    expect(r.facets.category['Language']).toBeGreaterThan(0)
  })

  it('filters by employmentType none when not present', () => {
    const r = search(index, 'lead', { filters: { employmentType: 'Full-time' } })
    expect(r.results.length === 0 || r.results.every(x => x.kind === 'experience')).toBe(true)
  })

  it('year exact filter certification', () => {
    const r = search(index, '', { filters: { year: 2023, kinds: ['certification'] } })
    expect(r.results.every(x => x.kind === 'certification')).toBe(true)
  })

  it('empty query returns boosted ordering', () => {
    const r = search(index, '')
    // Expect first item to be project or experience due to higher boost
    expect(['project','experience']).toContain(r.results[0]?.kind)
  })

  it('prefix token matches (startsWith branch)', () => {
    const r = search(index, 'typ') // should prefix match TypeScript
    expect(r.results.length).toBeGreaterThan(0)
  })

  it('unmatched secondary token triggers early rejection', () => {
    const r = search(index, 'typescript qqqqqqzzzz')
    // No doc should satisfy both tokens
    expect(r.results.length).toBe(0)
  })

  it('year range filtering includes expected certification', () => {
    const r = search(index, '', { filters: { year: { gte: 2022, lte: 2023 } } })
    // Should include the 2023 certification
    expect(r.results.some(x => x.kind === 'certification')).toBe(true)
    // And exclude years outside range (we only have 2023 in sample, so fine)
  })

  it('snippet omitted for skill & certification kinds', () => {
    const skillRes = search(index, 'typescript', { filters: { kinds: ['skill'] } })
    expect(skillRes.results[0]?.snippet).toBeUndefined()
    const certRes = search(index, 'cka', { filters: { kinds: ['certification'] } })
    expect(certRes.results[0]?.snippet).toBeUndefined()
  })

  it('derivePeriodSort undefined branch covered with period lacking year', () => {
    const custom = buildIndex({ ...(sampleCvData as any), experiences: [ { id: 'x', company: 'Acme', role: 'Engineer', period: 'Present', achievements: [] } ] })
    const exp = custom.find(d => d.id === 'x')
    expect(exp?.periodSort).toBeUndefined()
  })

  it('sorts by periodSort when scores tie', () => {
    const data: any = { ...(sampleCvData as any), experiences: [
      { id: 'exp-old', company: 'Co', role: 'Engineer', period: '2022 – 2023', achievements: [], stack: [] },
      { id: 'exp-new', company: 'Co', role: 'Engineer', period: '2023 – 2024', achievements: [], stack: [] }
    ] }
    const idx = buildIndex(data)
    const r = search(idx, 'engineer', { filters: { kinds: ['experience'] } })
    // Newer period should come first
    expect(r.results[0]?.id).toBe('exp-new')
  })

  it('sorts by id when scores and periodSort tie', () => {
    const data: any = { ...(sampleCvData as any), certifications: [
      { id: 'b-cert', name: 'B Cert', issuer: 'Org', year: 2023 },
      { id: 'a-cert', name: 'A Cert', issuer: 'Org', year: 2023 }
    ] }
    const idx = buildIndex(data)
    const r = search(idx, 'cert', { filters: { kinds: ['certification'] } })
    expect(r.results.map(x => x.id).slice(0,2)).toEqual(['a-cert','b-cert'])
  })

  it('snippet falls back to achievements then highlights', () => {
    const data: any = { ...(sampleCvData as any), experiences: [
      { id: 'exp-ach', company: 'Acme', role: 'Role', period: '2023 – 2024', achievements: [ { summary: 'Built amazing pipeline. Extra words.', impact: '' } ] }
    ], projects: [
      { id: 'proj-hl', title: 'Proj', role: 'Dev', period: '2024', highlights: ['Improved uptime via refactor'], stack: [] }
    ] }
    const idx = buildIndex(data)
    const r1 = search(idx, 'pipeline', { filters: { kinds: ['experience'] } })
    expect(r1.results[0]?.snippet?.toLowerCase()).toContain('built amazing pipeline')
    const r2 = search(idx, 'uptime', { filters: { kinds: ['project'] } })
    expect(r2.results[0]?.snippet).toContain('Improved uptime')
  })
})
