import { describe, it, expect } from 'vitest'
import { buildIndex, search, emptySearchResponse } from '@/lib/cv/search'

// Covers additional branches in search.ts: empty query (tokens length 0),
// yearRange filtering (gte/lte rejects), yearRange with object created via Object.create(null),
// snippet generation fallbacks (skill -> undefined, project with empty content -> undefined, experience achievements, education summary),
// and passesFilters negative path.

describe('search additional branches', () => {
  const baseData = {
    person: { name: 'X', title: 'T', profile: '', contact: { email: 'x@y.z' }, links: [] },
    skills: [{ id: 's1', name: 'TypeScript', category: 'language', tags: ['ts'] }],
    projects: [{ id: 'p1', title: 'Alpha', role: 'Dev', period: '2024', company: 'Acme', summary: '', highlights: [], stack: [], impact: '' }],
    experiences: [{ id: 'e1', company: 'Co', role: 'Engineer', period: '2023 – Present', summary: undefined, achievements: [{ id: 'a1', summary: 'Built thing.', impact: '' }], stack: ['node'], tags: [], employmentType: 'full-time' }],
    education: [{ id: 'ed1', institution: 'Uni', degree: 'BSc', field: 'CS', period: '2020 – 2023', highlights: ['Honors'], summary: 'Graduated with honors.' }],
    certifications: [{ id: 'c1', name: 'Cert A', issuer: 'Org', year: 2022 }]
  } as any
  const index = buildIndex(baseData)

  it('returns all docs with boost scores for empty query (tokens length 0 branch)', () => {
    const res = search(index, '')
    // total equals index length
    expect(res.total).toBe(index.length)
    // Score should equal KIND boost for each doc (since base=0 then multiplied by boost)
    const docScores = Object.fromEntries(res.results.map(r => [r.id, r.score]))
    expect(docScores.s1).toBeGreaterThan(0)
  })

  it('applies year gte/lte filters (yearRange branches)', () => {
    // Create year range object without toString to trigger yearRange detection path
    const yearRange = Object.assign(Object.create(null), { gte: 2023, lte: 2023 })
    const res = search(index, 'cert', { filters: { year: yearRange } })
    // Certification year is 2022 -> filtered out (gte branch returns false)
    expect(res.results.find(r => r.id === 'c1')).toBeUndefined()
    // Now lte branch: narrow to <= 2021 should also exclude if year greater than lte
    const yearRange2 = Object.assign(Object.create(null), { gte: 2010, lte: 2021 })
    const res2 = search(index, 'cert', { filters: { year: yearRange2 } })
    expect(res2.results.find(r => r.id === 'c1')).toBeUndefined()
  })

  it('builds snippets using achievements / summary and leaves some undefined', () => {
    const res = search(index, 'engineer')
    const expItem = res.results.find(r => r.id === 'e1')
    expect(expItem?.snippet).toBeDefined() // from achievement sentence
    const projRes = search(index, 'alpha')
    const projItem = projRes.results.find(r => r.id === 'p1')
    expect(projItem?.snippet).toBeUndefined() // project has no summary/highlights -> undefined snippet path
    const certRes = search(index, 'cert')
    const certItem = certRes.results.find(r => r.id === 'c1')
    expect(certItem?.snippet).toBeUndefined() // certification early return snippet
  })

  it('filters out by kinds (passesFilters negative path)', () => {
    const res = search(index, 'typescript', { filters: { kinds: ['project'] } })
    // skill excluded
    expect(res.results.find(r => r.id === 's1')).toBeUndefined()
  })

  it('aggregates duplicate facet buckets and covers emptySearchResponse()', () => {
    // Add duplicate facet docs (second cert same issuer/year, second skill same category)
    const data2: any = JSON.parse(JSON.stringify(baseData))
    data2.certifications.push({ id: 'c2', name: 'Cert B', issuer: 'Org', year: 2022 })
    data2.skills.push({ id: 's2', name: 'JavaScript', category: 'language', tags: ['js'] })
    const idx2 = buildIndex(data2)
    const res = search(idx2, '')
    // Facet counts should reflect duplicates (>1)
    expect(res.facets.issuer.Org).toBe(2)
    expect(res.facets.year['2022']).toBe(2)
    expect(res.facets.category.language).toBeGreaterThanOrEqual(2)
  // Direct call to emptySearchResponse to mark lines
  const empty = emptySearchResponse()
    expect(empty.total).toBe(0)
    expect(Object.keys(empty.facets.category).length).toBe(0)
  })
})
