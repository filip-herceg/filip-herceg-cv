import { describe, it, expect, vi } from 'vitest'

// Targets remaining uncovered lines in service.ts (cache hit early return, full seeding loops for skills/projects,
// row mapping for all entity arrays, per-locale + '*' invalidation paths).

describe('cv-service uncovered branches', () => {
  it('seeds with full data, loads, cache hits, and invalidates', async () => {
    vi.resetModules()
    // Prisma mock implementing all needed methods
    let personCreated = false
    let skillCreateManyCount = 0
    let projectCreateManyCount = 0
    class MockPrisma {
      person = {
        findUnique: async ({ where: { locale } }: any) => (personCreated ? { locale, name: 'X', title: 'Y', profile: 'Z', email: 'seed@example.com', location: null, phone: null, website: null, github: null, linkedin: null, twitter: null, linksJson: '[]' } : null),
        create: async () => { personCreated = true; return {} }
      }
  skill = { createMany: async ({ data }: any) => { skillCreateManyCount += data.length } , findMany: async () => ([{ id: 'sk1', locale: 'en', name: 'TS', category: 'Language', level: null, years: 5, tagsJson: JSON.stringify(['ts']) }]) }
      project = { createMany: async ({ data }: any) => { projectCreateManyCount += data.length }, findMany: async () => ([{ id: 'pr1', locale: 'en', title: 'Proj', role: 'Dev', period: '2024', company: 'Ac', summary: 'Summary', highlightsJson: JSON.stringify(['Did']), stackJson: JSON.stringify(['ts']), impact: null, linksJson: JSON.stringify([]) }]) }
  experience = { findMany: async () => ([{ id: 'ex1', locale: 'en', company: 'Co', role: 'Engineer', period: '2023', location: null, employmentType: 'Full-time', summary: 'Work', achievementsJson: JSON.stringify([]), stackJson: JSON.stringify(['node']), tagsJson: JSON.stringify([]) }]) }
      education = { findMany: async () => ([{ id: 'ed1', locale: 'en', institution: 'Uni', degree: 'BSc', field: 'CS', period: '2020-2023', location: null, grade: null, summary: 'Study', highlightsJson: JSON.stringify([]) }]) }
      certification = { findMany: async () => ([{ id: 'ce1', locale: 'en', name: 'Cert', issuer: 'Org', year: 2022, url: null }]) }
      trait = { findMany: async () => ([{ id: 'tr1', locale: 'en', name: 'Collaborative', description: 'Desc', category: 'soft' }]) }
      hobby = { findMany: async () => ([{ id: 'hb1', locale: 'en', name: 'Chess', description: 'Desc' }]) }
      design = {
        upsert: async () => ({ locale: 'en' }),
        findUnique: async () => ({
          locale: 'en',
          pageJson: JSON.stringify({ size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }),
          paletteJson: JSON.stringify({ mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#333' }),
          typographyJson: JSON.stringify({ body: 'sys', heading: 'sys', scale: 1 }),
          shapesJson: JSON.stringify([]),
          sectionsJson: JSON.stringify([])
        })
      }
    }
    vi.doMock('@prisma/client', () => ({ PrismaClient: MockPrisma }))
    const svc = await import('@/lib/cv/service')
    const seedData = {
      person: { name: 'Seed', title: 'Title', profile: 'Profile', contact: { email: 'seed@example.com' }, links: [] },
  skills: [{ id: 'sk1', name: 'TS', category: 'Language', years: 5, tags: ['ts'] }],
      projects: [{ id: 'pr1', title: 'Proj', role: 'Dev', period: '2024', company: 'Ac', summary: 'Summary', highlights: ['Did'], stack: ['ts'], impact: undefined, links: [] }]
    } as any
    const design = { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#333' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] } as any

    const seeded = await svc.seedIfEmpty('en', seedData, design)
    expect(seeded).toBe(true)
    expect(skillCreateManyCount).toBe(1)
    expect(projectCreateManyCount).toBe(1)
    // First aggregate load (db path)
    const agg1 = await svc.getAggregate('en')
    expect(agg1.source).toBe('db')
    expect(agg1.data.skills?.[0].name).toBe('TS')
    // Second aggregate load should hit cache early-return path
    const agg2 = await svc.getAggregate('en')
    expect(agg2.source).toBe('db')
    // Invalidate per-locale and load again
    svc.invalidateAggregateCache('en')
    const agg3 = await svc.getAggregate('en')
    expect(agg3.source).toBe('db')
    // Invalidate all
    svc.invalidateAggregateCache('*')
  })
})
