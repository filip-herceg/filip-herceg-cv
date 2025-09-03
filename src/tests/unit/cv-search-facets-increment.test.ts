import { describe, it, expect } from 'vitest'

// Directly exercises buildFacets increment path via public search API to ensure facet bucket increments lines counted.

describe('cv-search facets increment aggregation', () => {
  it('increments existing facet buckets (category, issuer, year)', async () => {
    const { buildIndex, search } = await import('@/lib/cv/search')
    const base: any = {
      person: { name: 'X', title: 'Y', profile: '', contact: { email: 'x@y.z' }, links: [] },
      skills: [ { id: 's1', name: 'React', category: 'frontend' }, { id: 's2', name: 'Next', category: 'frontend' } ],
      projects: [], experiences: [], education: [], certifications: [ { id: 'c1', name: 'Cert A', issuer: 'Org', year: 2024 } ]
    }
    const index = buildIndex(base)
    const resp = search(index, '')
    expect(resp.facets.category.frontend).toBe(2)
    expect(resp.facets.issuer.Org).toBe(1)
    expect(resp.facets.year['2024']).toBe(1)
  })
})
