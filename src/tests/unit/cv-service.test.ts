import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CvData, CvDesign } from '@/lib/cv/schema'

// We mock metrics early so when service module loads it sees these stubs
const loadIncs: Array<Record<string,string>> = []
vi.mock('@/lib/metrics', () => ({
  cvAggregateLoadsTotal: { inc: (labels: Record<string,string>) => { loadIncs.push(labels) } },
  // Additional metrics referenced indirectly by sample-data/storage loaders
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  // Some storage backends may reference a backend gauge or other counters
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
}))

// In-memory fake DB per test
interface PersonRow { locale: string; name: string; title: string; profile: string; email: string; location?: string | null; phone?: string | null; website?: string | null; github?: string | null; linkedin?: string | null; twitter?: string | null; linksJson?: string | null }
interface DesignRow { locale: string; pageJson: string; paletteJson: string; typographyJson: string; shapesJson: string; sectionsJson: string }

let people: PersonRow[] = []
let designs: DesignRow[] = []
interface SkillRow { id: string; locale: string; name: string; category: string | null; level: string | null; years: number | null; tagsJson: string | null }
interface ProjectRow { id: string; locale: string; title: string; role: string; period: string; company: string | null; summary: string; highlightsJson: string; stackJson: string; impact: string | null; linksJson: string | null }
let skills: SkillRow[] = []
let projects: ProjectRow[] = []
// The following relational categories are not seeded in these unit tests; they always resolve empty.
// We simplify by not maintaining mutable in-memory arrays for them.

// Prisma client mock with minimal surface used by service.ts
vi.mock('@prisma/client', () => {
  type WhereLocale = { where: { locale: string } }
  class PrismaClient {
    person = {
      findUnique: async ({ where: { locale } }: WhereLocale) => people.find(p => p.locale === locale) || null,
      create: async ({ data }: { data: PersonRow }) => { people.push(data); return data }
    }
    skill = {
      findMany: async ({ where: { locale } }: WhereLocale) => skills.filter(s => s.locale === locale),
      createMany: async ({ data }: { data: SkillRow[] }) => { skills.push(...data); return { count: data.length } }
    }
    project = {
      findMany: async ({ where: { locale } }: WhereLocale) => projects.filter(p => p.locale === locale),
      createMany: async ({ data }: { data: ProjectRow[] }) => { projects.push(...data); return { count: data.length } }
    }
    // Unused relational lookups return empty arrays.
    experience = { findMany: async (_args?: WhereLocale) => [] as unknown[] }
    education = { findMany: async (_args?: WhereLocale) => [] as unknown[] }
    certification = { findMany: async (_args?: WhereLocale) => [] as unknown[] }
    trait = { findMany: async (_args?: WhereLocale) => [] as unknown[] }
    hobby = { findMany: async (_args?: WhereLocale) => [] as unknown[] }
    design = {
      findUnique: async ({ where: { locale } }: WhereLocale) => designs.find(d => d.locale === locale) || null,
      upsert: async ({ where: { locale }, create, update }: { where: { locale: string }; create: DesignRow; update: Partial<DesignRow> }) => {
        const existing = designs.find(d => d.locale === locale)
        if (existing) { Object.assign(existing, update); return existing }
        designs.push(create); return create
      }
    }
  }
  return { PrismaClient }
})

// Utility to reset fake DB
function resetDb() {
  people = []
  designs = []
  skills = []
  projects = []
  // removed unused arrays for experience/education/certification/trait/hobby categories
  loadIncs.length = 0
}

describe('cv-service getAggregate & seedIfEmpty', () => {
  beforeEach(() => { vi.resetModules(); resetDb() })

  it('returns empty fallback when db has no person', async () => {
    const { getAggregate } = await import('@/lib/cv/service')
    const res = await getAggregate('en')
    expect(res.source).toBe('empty')
    expect(res.data.person.name).toBe('Your Name')
    // metrics recorded with source empty
    expect(loadIncs.some(l => l.source === 'empty')).toBe(true)
  })

  it('loads from db then hits in-memory cache on second call', async () => {
    // Prepare person + design rows before first call
    people.push({
      locale: 'en',
      name: 'Jane Doe',
      title: 'Engineer',
      profile: 'Profile',
      email: 'jane@example.com',
      linksJson: JSON.stringify([{ label: 'site', url: 'https://example.com' }]),
    })
    designs.push({
      locale: 'en',
      pageJson: JSON.stringify({ size: 'A4', margin: '12mm', columns: 2, gutter: '4mm' }),
      paletteJson: JSON.stringify({ mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#444' }),
      typographyJson: JSON.stringify({ body: 'a', heading: 'b', scale: 1 }),
      shapesJson: JSON.stringify([]),
      sectionsJson: JSON.stringify([]),
    })
    const { getAggregate } = await import('@/lib/cv/service')
    const first = await getAggregate('en')
    expect(first.source).toBe('db')
    expect(first.data.person.name).toBe('Jane Doe')
    // mutate underlying DB to prove cache prevents change visibility
    people[0].name = 'Mutated'
    const second = await getAggregate('en')
    expect(second.data.person.name).toBe('Jane Doe') // cached
    // We should have exactly one db metric (source db) and no second db increment.
    const dbLoads = loadIncs.filter(l => l.source === 'db').length
    expect(dbLoads).toBe(1)
  })

  it('seedIfEmpty inserts data only once and invalidates cache', async () => {
    const { seedIfEmpty, getAggregate, invalidateAggregateCache } = await import('@/lib/cv/service')
    const data: CvData = {
      person: { name: 'A', title: 'B', profile: 'P', contact: { email: 'a@example.com' }, links: [] },
      skills: [{ id: 's1', name: 'Skill 1', category: 'Language', level: 'mid', years: 3, tags: ['t'] }],
      projects: [{ id: 'p1', title: 'Proj', role: 'Dev', period: '2020', summary: 'Sum', highlights: [], stack: [] }]
    }
    const design: CvDesign = {
      page: { size: 'A4', margin: '12mm', columns: 2, gutter: '4mm' },
      palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#444' },
      typography: { body: 'x', heading: 'y', scale: 1 },
      shapes: [],
      sections: []
    }
    const seeded = await seedIfEmpty('en', data, design)
    expect(seeded).toBe(true)
    const again = await seedIfEmpty('en', data as any, design as any)
    expect(again).toBe(false)
    const agg = await getAggregate('en')
    expect(agg.data.person.name).toBe('A')
    // After invalidation & mutation underlying db, name changes next retrieval
    invalidateAggregateCache('*')
    people[0].name = 'A2'
    const agg2 = await getAggregate('en')
    expect(agg2.data.person.name).toBe('A2')
  })
})
