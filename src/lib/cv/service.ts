import { PrismaClient, type Skill, type Project, type Experience, type Education, type Certification, type Trait, type Hobby } from '@prisma/client'
import { CvDataSchema, CvDesignSchema, type CvData, type CvDesign } from './schema'
import { cvAggregateLoadsTotal } from '@/lib/metrics'
import pino from 'pino'

// Narrow JSON.parse results to unknown so Zod validates and we avoid implicit any
function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as unknown as T
  } catch {
    return fallback
  }
}

let prisma: PrismaClient | undefined
function getPrisma(): PrismaClient {
  prisma ??= new PrismaClient()
  return prisma
}
const log = pino({ name: 'cv-service' })

// Simple in-memory cache (locale -> aggregate) to minimize DB round trips.
interface AggregateCacheEntry { data: CvData; design: CvDesign; loadedAt: number }
const aggregateCache = new Map<string, AggregateCacheEntry>()
const CACHE_TTL_MS = 60_000

// Returns aggregate CV data+design. Possible sources:
// - db: loaded fully from persistence (validated)
// - empty: database has no person/design rows yet (fresh deploy) -> provide empty onboarding state
export async function getAggregate(locale: string = 'en'): Promise<{ data: CvData; design: CvDesign; source: 'db' | 'empty' }> {
  const now = Date.now()
  const cached = aggregateCache.get(locale)
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) return { data: cached.data, design: cached.design, source: 'db' }

  const dbResult = await loadFromDb(locale)
  if (dbResult) return dbResult

  const empty = buildEmptyData()
  const emptyDesign = buildEmptyDesign()
  try { cvAggregateLoadsTotal.inc({ source: 'empty' }) } catch {}
  return { data: empty, design: emptyDesign, source: 'empty' }
}

async function loadFromDb(locale: string) {
  try {
    const client = getPrisma()
    const [person, skills, projects, experiences, education, certifications, traits, hobbies, design] = await Promise.all([
      client.person.findUnique({ where: { locale } }),
      client.skill.findMany({ where: { locale } }),
      client.project.findMany({ where: { locale } }),
      client.experience.findMany({ where: { locale } }),
      client.education.findMany({ where: { locale } }),
      client.certification.findMany({ where: { locale } }),
      client.trait.findMany({ where: { locale } }),
      client.hobby.findMany({ where: { locale } }),
      client.design.findUnique({ where: { locale } })
    ])
    if (!person) return null
    const mapped = mapRowsToData({ person, skills, projects, experiences, education, certifications, traits, hobbies })
    const designParsed = design ? CvDesignSchema.safeParse({
      page: safeJson(design.pageJson, {}),
      palette: safeJson(design.paletteJson, {}),
      typography: safeJson(design.typographyJson, {}),
      shapes: safeJson(design.shapesJson, {}),
      sections: safeJson(design.sectionsJson, {})
    }) : null
    if (mapped.success && designParsed?.success) {
      const entry: AggregateCacheEntry = { data: mapped.data, design: designParsed.data, loadedAt: Date.now() }
      aggregateCache.set(locale, entry)
      try { cvAggregateLoadsTotal.inc({ source: 'db' }) } catch {}
      return { data: entry.data, design: entry.design, source: 'db' as const }
    }
    if (!mapped.success) log.warn({ err: mapped.error }, 'cv data parse failed from db')
    if (designParsed && !designParsed.success) log.warn({ err: designParsed.error }, 'cv design parse failed from db')
  } catch (e) {
    log.warn({ err: e }, 'db load failed; falling back to static')
  }
  return null
}

function mapRowsToData(rows: { person: any; skills: Skill[]; projects: Project[]; experiences: Experience[]; education: Education[]; certifications: Certification[]; traits: Trait[]; hobbies: Hobby[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return CvDataSchema.safeParse({
    person: {
      name: rows.person.name,
      title: rows.person.title,
      profile: rows.person.profile,
      contact: {
        email: rows.person.email,
        location: rows.person.location ?? undefined,
        phone: rows.person.phone ?? undefined,
        website: rows.person.website ?? undefined,
        github: rows.person.github ?? undefined,
        linkedin: rows.person.linkedin ?? undefined,
        twitter: rows.person.twitter ?? undefined
      },
      links: safeJson(rows.person.linksJson, undefined)
    },
    skills: rows.skills.map((s: Skill & { tagsJson?: string | null }) => ({ id: s.id, name: s.name, category: s.category, level: s.level ?? undefined, years: (s as Skill & { years?: number }).years ?? undefined, tags: safeJson<Record<string,string>[] | string[] | undefined>(s.tagsJson, undefined) })),
    projects: rows.projects.map((p: Project & { highlightsJson?: string | null; stackJson?: string | null; impact?: string | null; linksJson?: string | null; company?: string | null }) => ({ id: p.id, title: p.title, role: p.role, period: p.period, company: p.company ?? undefined, summary: p.summary, highlights: safeJson<string[]>(p.highlightsJson, []), stack: safeJson<string[]>(p.stackJson, []), impact: p.impact ?? undefined, links: safeJson<Record<string,string>[] | undefined>(p.linksJson, undefined) })),
    experiences: rows.experiences.map((e: Experience & { location?: string | null; employmentType?: string | null; summary?: string | null; achievementsJson?: string | null; stackJson?: string | null; tagsJson?: string | null }) => ({ id: e.id, company: e.company, role: e.role, period: e.period, location: e.location ?? undefined, employmentType: e.employmentType ?? undefined, summary: e.summary ?? undefined, achievements: safeJson<string[]>(e.achievementsJson, []), stack: safeJson<string[]>(e.stackJson, []), tags: safeJson<string[]>(e.tagsJson, [] ) })),
    education: rows.education.map((ed: Education & { field?: string | null; location?: string | null; grade?: string | null; summary?: string | null; highlightsJson?: string | null }) => ({ id: ed.id, institution: ed.institution, degree: ed.degree, field: ed.field ?? undefined, period: ed.period, location: ed.location ?? undefined, grade: ed.grade ?? undefined, summary: ed.summary ?? undefined, highlights: safeJson<string[]>(ed.highlightsJson, []) })),
    certifications: rows.certifications.map((c: Certification & { year?: number | null; url?: string | null }) => ({ id: c.id, name: c.name, issuer: c.issuer, year: c.year ?? undefined, url: c.url ?? undefined })),
    traits: rows.traits.map((t: Trait & { description?: string | null; category?: string | null }) => ({ id: t.id, name: t.name, description: t.description ?? undefined, category: t.category ?? undefined })),
    hobbies: rows.hobbies.map((h: Hobby & { description?: string | null }) => ({ id: h.id, name: h.name, description: h.description ?? undefined }))
  })
}

function buildEmptyData(): CvData {
  return {
    person: {
      name: 'Your Name',
      title: 'Role / Title',
      profile: 'Welcome! Start by seeding your CV data via the upcoming admin interface.',
      contact: { email: 'you@example.com' },
      links: []
    },
    skills: [],
    projects: []
  }
}

function buildEmptyDesign(): CvDesign {
  return {
    page: { size: 'A4', margin: '16mm', columns: 2, gutter: '8mm' },
    palette: { mode: 'light', primary: '#1e293b', accent: '#0ea5e9', background: '#ffffff', surface: '#f1f5f9', text: '#0f172a', mutedText: '#64748b' },
    typography: { body: 'system-ui, sans-serif', heading: 'system-ui, sans-serif', scale: 1 },
    shapes: [],
    sections: [
      { id: 'profile', label: 'Profile', order: 1, enabled: true },
      { id: 'skills', label: 'Skills', order: 2, enabled: true },
      { id: 'projects', label: 'Projects', order: 3, enabled: true }
    ]
  }
}

// Invalidate a specific locale (or all if locale === '*') – used by admin mutations
export function invalidateAggregateCache(locale: string) {
  if (locale === '*') {
    aggregateCache.clear()
    return
  }
  aggregateCache.delete(locale)
}

