import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock metrics with all exports touched transitively by loader/storage to avoid unhandled promise rejections.
vi.mock('@/lib/metrics', () => ({
  cvAggregateLoadsTotal: { inc: () => {} },
  cvStorageGetDurationSeconds: { startTimer: () => () => {} },
  cvStorageBackend: { labels: () => ({ set: () => {} }) },
  cvCacheHitsTotal: { inc: () => {} },
  cvCacheMissesTotal: { inc: () => {} },
}))

interface PersonRow { locale: string; name: string; title: string; profile: string; email: string; linksJson?: string | null }
interface SkillRow { id: string; locale: string; name: string; category: string | null; level: string | null; years: number | null; tagsJson: string | null }
interface ProjectRow { id: string; locale: string; title: string; role: string; period: string; summary: string; highlightsJson: string; stackJson: string; impact: string | null; company: string | null; linksJson: string | null }
interface ExperienceRow { id: string; locale: string; company: string; role: string; period: string; location: string | null; employmentType: string | null; summary: string | null; achievementsJson: string; stackJson: string; tagsJson: string }
interface EducationRow { id: string; locale: string; institution: string; degree: string; field: string | null; period: string; location: string | null; grade: string | null; summary: string | null; highlightsJson: string }
interface CertificationRow { id: string; locale: string; name: string; issuer: string; year: number | null; url: string | null }
interface TraitRow { id: string; locale: string; name: string; description: string | null; category: string | null }
interface HobbyRow { id: string; locale: string; name: string; description: string | null }
interface DesignRow { locale: string; pageJson: string; paletteJson: string; typographyJson: string; shapesJson: string; sectionsJson: string }

let people: PersonRow[] = []
let skills: SkillRow[] = []
let projects: ProjectRow[] = []
let experiences: ExperienceRow[] = []
let education: EducationRow[] = []
let certifications: CertificationRow[] = []
let traits: TraitRow[] = []
let hobbies: HobbyRow[] = []
let designs: DesignRow[] = []

vi.mock('@prisma/client', () => {
  type WhereLocale = { where: { locale: string } }
  class PrismaClient {
    person = { findUnique: async ({ where: { locale } }: WhereLocale) => people.find(p => p.locale === locale) || null, create: async ({ data }: { data: PersonRow }) => { people.push(data); return data } }
    skill = { findMany: async ({ where: { locale } }: WhereLocale) => skills.filter(s => s.locale === locale) }
    project = { findMany: async ({ where: { locale } }: WhereLocale) => projects.filter(p => p.locale === locale) }
    experience = { findMany: async ({ where: { locale } }: WhereLocale) => experiences.filter(e => e.locale === locale) }
    education = { findMany: async ({ where: { locale } }: WhereLocale) => education.filter(e => e.locale === locale) }
    certification = { findMany: async ({ where: { locale } }: WhereLocale) => certifications.filter(c => c.locale === locale) }
    trait = { findMany: async ({ where: { locale } }: WhereLocale) => traits.filter(t => t.locale === locale) }
    hobby = { findMany: async ({ where: { locale } }: WhereLocale) => hobbies.filter(h => h.locale === locale) }
    design = { findUnique: async ({ where: { locale } }: WhereLocale) => designs.find(d => d.locale === locale) || null }
  }
  return { PrismaClient }
})

function reset() {
  people = []
  skills = []
  projects = []
  experiences = []
  education = []
  certifications = []
  traits = []
  hobbies = []
  designs = []
}

describe('cv-service extended mapping', () => {
  beforeEach(() => { vi.resetModules(); reset() })
  it('maps all optional collections from db', async () => {
    people.push({ locale: 'en', name: 'N', title: 'T', profile: 'P', email: 'n@example.com' })
    skills.push({ id: 's', locale: 'en', name: 'S', category: 'Language', level: null, years: null, tagsJson: '[]' })
    projects.push({ id: 'p', locale: 'en', title: 'Proj', role: 'Dev', period: '2024', summary: 'Sum', highlightsJson: '[]', stackJson: '[]', impact: null, company: null, linksJson: null })
    experiences.push({ id: 'e', locale: 'en', company: 'Co', role: 'R', period: '2023', location: null, employmentType: null, summary: null, achievementsJson: '[]', stackJson: '[]', tagsJson: '[]' })
    education.push({ id: 'ed', locale: 'en', institution: 'Uni', degree: 'BSc', field: null, period: '2018', location: null, grade: null, summary: null, highlightsJson: '[]' })
    certifications.push({ id: 'c1', locale: 'en', name: 'Cert', issuer: 'Iss', year: 2024, url: null })
    traits.push({ id: 't1', locale: 'en', name: 'Trait', description: null, category: null })
    hobbies.push({ id: 'h1', locale: 'en', name: 'Hobby', description: null })
    designs.push({ locale: 'en', pageJson: JSON.stringify({ size: 'A4', margin: '10mm', columns: 2, gutter: '4mm' }), paletteJson: JSON.stringify({ mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#444' }), typographyJson: JSON.stringify({ body: 'a', heading: 'b', scale: 1 }), shapesJson: '[]', sectionsJson: '[]' })

    const { getAggregate } = await import('@/lib/cv/service')
    const agg = await getAggregate('en')
    expect(agg.source).toBe('db')
    expect(agg.data.experiences?.length).toBe(1)
    expect(agg.data.education?.length).toBe(1)
    expect(agg.data.certifications?.length).toBe(1)
    expect(agg.data.traits?.length).toBe(1)
    expect(agg.data.hobbies?.length).toBe(1)
  })
})
