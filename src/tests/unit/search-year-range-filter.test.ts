import { describe, it, expect, vi } from 'vitest'

// Exercises passesFilters() yearRange gte/lte early-return branches in search.ts (lines with y < gte and y > lte)

vi.mock('@/lib/metrics', () => ({
  // keep minimal metric mocks used indirectly in some helper paths
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} }
}))

import { buildIndex, search } from '@/lib/cv/search'

describe('search year range filters (gte/lte branches)', () => {
  it('excludes certs outside inclusive range and includes those inside', () => {
    const data = {
      person: { name: 'A', title: 'T', profile: '', contact: { email: 'a@b.c' }, links: [] },
      skills: [],
      projects: [],
      certifications: [
        { id: 'c2021', name: 'Old Cert', issuer: 'Org', year: 2021, url: undefined }, // y < gte branch
        { id: 'c2023', name: 'Mid Cert', issuer: 'Org', year: 2023, url: undefined }, // included
        { id: 'c2024', name: 'New Cert', issuer: 'Org', year: 2024, url: undefined }  // y > lte branch
      ]
    }
    // Build index, then search with range gte 2022 lte 2023
    const index = buildIndex(data as any) // schema validation handled inside buildIndex
  // Use prototype-less object so 'toString' in yearFilter is false and range logic executes.
  const yearRange = Object.assign(Object.create(null), { gte: 2022, lte: 2023 })
  const res = search(index, '', { filters: { year: yearRange } })
  expect(res.results.map(r => r.id)).toEqual(['c2023'])
  })
})
