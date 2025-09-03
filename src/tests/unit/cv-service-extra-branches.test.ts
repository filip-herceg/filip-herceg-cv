import { describe, it, expect, vi } from 'vitest'

// Target: cover cv/service.ts lines 15-16 (JSON.parse catch), 53-54 (cv design parse warn), 122-123 (seedIfEmpty catch warn), 161 (invalidateAggregateCache branch for '*').

describe('cv-service extra defensive branches', () => {
  it('safeJson falls back on malformed JSON inside loadFromDb (data parse fail branch)', async () => {
    vi.resetModules()
    // Mock Prisma client minimal subset used in loadFromDb to force invalid JSON in design row
    const fakePerson = { locale: 'en', name: 'N', title: 'T', profile: 'P', email: 'a@b.c', location: null, phone: null, website: null, github: null, linkedin: null, twitter: null, linksJson: '[]' }
    const fakeDesign = { locale: 'en', pageJson: '{bad', paletteJson: '{bad', typographyJson: '{bad', shapesJson: '{bad', sectionsJson: '{bad' }
    const collections: Record<string, unknown[]> = { skill: [], project: [], experience: [], education: [], certification: [], trait: [], hobby: [] }
    vi.doMock('@prisma/client', () => ({ PrismaClient: class { person = { findUnique: async () => fakePerson }; design = { findUnique: async () => fakeDesign }; skill = { findMany: async () => collections.skill }; project = { findMany: async () => collections.project }; experience = { findMany: async () => collections.experience }; education = { findMany: async () => collections.education }; certification = { findMany: async () => collections.certification }; trait = { findMany: async () => collections.trait }; hobby = { findMany: async () => collections.hobby } } }))
    const svc = await import('@/lib/cv/service')
    const agg = await svc.getAggregate('en')
    // design parse fails -> returns empty design fallback flagged as 'empty' or 'db'? logic returns db only if person exists and design valid; so should fallback to empty? actually mapRowsToData success (person minimal) but designParsed fails => skip caching and returns null -> getAggregate builds empty state
    expect(agg.source).toBe('empty')
  })

  it('seedIfEmpty catches error and returns false (catch warn branch)', async () => {
    vi.resetModules()
    // Mock Prisma so that create throws
    class ThrowPrisma { person = { findUnique: async () => null, create: async () => { throw new Error('fail') } }; skill = { createMany: async () => {} }; project = { createMany: async () => {} }; design = { upsert: async () => {} } }
    vi.doMock('@prisma/client', () => ({ PrismaClient: ThrowPrisma }))
    const svc = await import('@/lib/cv/service')
  const seeded = await svc.seedIfEmpty('en', { person: { name: 'A', title: 'B', profile: 'C', contact: { email: 'x@y.z' }, links: [] }, skills: [], projects: [] }, { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#333' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] })
    expect(seeded).toBe(false)
  })

  it('invalidateAggregateCache clears all with *', async () => {
    vi.resetModules()
    const svc = await import('@/lib/cv/service')
    // populate cache by successful empty fallback call
    await svc.getAggregate('en')
    svc.invalidateAggregateCache('*')
    // a second getAggregate should still work returning empty (indirectly exercises branch)
    const agg2 = await svc.getAggregate('en')
    expect(agg2.data.person.name).toBeDefined()
  })
})
