import { describe, it, expect, vi, beforeEach } from 'vitest'

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
let skills: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
let projects: any[] = []
let experiences: any[] = []
let education: any[] = []
let certifications: any[] = []
let traits: any[] = []
let hobbies: any[] = []

// Prisma client mock with minimal surface used by service.ts
vi.mock('@prisma/client', () => {
  class PrismaClient {
    person = {
      findUnique: async ({ where: { locale } }: any) => people.find(p => p.locale === locale) || null,
      create: async ({ data }: { data: PersonRow }) => { people.push(data); return data },
    }
    skill = { findMany: async ({ where: { locale } }: any) => skills.filter(s => s.locale === locale), createMany: async ({ data }: any) => { skills.push(...data); return { count: data.length } } }
    project = { findMany: async ({ where: { locale } }: any) => projects.filter(s => s.locale === locale), createMany: async ({ data }: any) => { projects.push(...data); return { count: data.length } } }
  // The following findMany methods reference arrays defined above; explicit inline references to silence unused warnings.
  experience = { findMany: async ({ where: { locale } }: any) => experiences.filter(s => s.locale === locale) } // eslint-disable-line @typescript-eslint/no-explicit-any
  education = { findMany: async ({ where: { locale } }: any) => education.filter(s => s.locale === locale) } // eslint-disable-line @typescript-eslint/no-explicit-any
  certification = { findMany: async ({ where: { locale } }: any) => certifications.filter(s => s.locale === locale) } // eslint-disable-line @typescript-eslint/no-explicit-any
  trait = { findMany: async ({ where: { locale } }: any) => traits.filter(s => s.locale === locale) } // eslint-disable-line @typescript-eslint/no-explicit-any
  hobby = { findMany: async ({ where: { locale } }: any) => hobbies.filter(s => s.locale === locale) } // eslint-disable-line @typescript-eslint/no-explicit-any
    design = {
      findUnique: async ({ where: { locale } }: any) => designs.find(d => d.locale === locale) || null,
      upsert: async ({ where: { locale }, create, update }: any) => {
        const existing = designs.find(d => d.locale === locale)
        if (existing) { Object.assign(existing, update); return existing }
        designs.push(create); return create
      },
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
  experiences = []
  education = []
  certifications = []
  traits = []
  hobbies = []
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
    const data = {
      person: { name: 'A', title: 'B', profile: 'P', contact: { email: 'a@example.com' }, links: [] },
  // Provide required category per SkillSchema (must be one of enumerated categories)
  skills: [{ id: 's1', name: 'Skill 1', category: 'Language', level: 'mid', years: 3, tags: ['t'] }],
      projects: [{ id: 'p1', title: 'Proj', role: 'Dev', period: '2020', summary: 'Sum', highlights: [], stack: [] }],
    }
    const design = {
      page: { size: 'A4', margin: '12mm', columns: 2, gutter: '4mm' },
      palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#444' },
      typography: { body: 'x', heading: 'y', scale: 1 },
      shapes: [],
      sections: [],
    }
    const seeded = await seedIfEmpty('en', data as any, design as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
