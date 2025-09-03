import { describe, it, expect } from 'vitest'
import { buildIndex, search } from '@/lib/cv/search'

// Explicitly target remaining uncovered facet increment lines in buildFacets (206-207).
// We construct docs such that every facet key is populated on at least one doc AND
// most have duplicates to exercise the (bucket[bucketKey] || 0) + 1 increment more than once.

describe('search facets final coverage', () => {
  const data: any = {
    person: { name: 'N', title: 'T', profile: '', contact: { email: 'a@b.c' }, links: [] },
    skills: [
      { id: 's1', name: 'TS', category: 'lang', tags: [] },
      { id: 's2', name: 'JS', category: 'lang', tags: [] }
    ],
    projects: [
      { id: 'p1', title: 'Proj', role: 'Dev', period: '2024', company: 'Ac', summary: 'Something.', highlights: ['Did X.'], stack: ['ts'], impact: '' }
    ],
    experiences: [
      { id: 'e1', company: 'Co', role: 'Engineer', period: '2023 – Present', summary: 'Built stuff.', achievements: [], stack: ['node'], tags: [], employmentType: 'full-time' },
      { id: 'e2', company: 'Co2', role: 'Engineer', period: '2022 – 2023', summary: 'Another.', achievements: [], stack: ['node'], tags: [], employmentType: 'full-time' }
    ],
    education: [
      { id: 'ed1', institution: 'Uni', degree: 'BSc', field: 'CS', period: '2020 – 2023', highlights: [], summary: 'Study.' }
    ],
    certifications: [
      { id: 'c1', name: 'CertA', issuer: 'Org', year: 2022 },
      { id: 'c2', name: 'CertB', issuer: 'Org', year: 2022 }
    ]
  }
  const index = buildIndex(data)

  it('aggregates all facet keys with duplicate increments', () => {
    const res = search(index, '')
    // Expect duplicates for category, employmentType, issuer, year
    expect(res.facets.category.lang).toBe(2)
    expect(res.facets.employmentType['full-time']).toBe(2)
    expect(res.facets.issuer.Org).toBe(2)
    expect(res.facets.year['2022']).toBe(2)
    expect(Object.keys(res.facets.institution)).toContain('Uni')
  })
})
