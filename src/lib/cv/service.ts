// NOTE: Broad JSON.parse + Zod validation for Prisma rows. Previously had
// global eslint-disable; refined now to rely on rule-specific allowances.
import { PrismaClient, Prisma, type Skill, type Project, type Experience, type Education, type Certification, type Trait, type Hobby } from '@prisma/client'
import { CV_PAGE_SIZE, CV_PAGE_MARGIN, CV_PAGE_COLUMNS, CV_PAGE_GUTTER } from '@/lib/constants'
import { CvDataSchema, CvDesignSchema, type CvData, type CvDesign } from './schema'
import { cvAggregateLoadsTotal } from '@/lib/metrics'
import pino from 'pino'

// Narrow JSON.parse outputs to unknown; Zod handles validation to keep types strict
function safeJson<T>(raw: string | Prisma.JsonValue | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    if (typeof raw === 'string') {
      return JSON.parse(raw) as unknown as T
    }
    // If it's already a JsonValue (object/array/primitive), trust it as-is.
    return raw as unknown as T
  } catch {
    return fallback
  }
}

let prisma: PrismaClient | undefined
function canUseDatabase() {
  const url = process.env.DATABASE_URL || ''
  const isTest = process.env.NODE_ENV === 'test'
  if (isTest) return true
  return Boolean(url.startsWith('postgresql://') || url.startsWith('postgres://'))
}
function getPrisma(): PrismaClient {
  if (!canUseDatabase()) {
    throw new Error('DATABASE_URL not configured; database access is disabled')
  }
  prisma ??= new PrismaClient()
  return prisma
}
const log = pino({ name: 'cv-service' })

// Simple in-memory cache (locale -> aggregate) to minimize DB round trips.
interface AggregateCacheEntry { data: CvData; design: CvDesign; loadedAt: number }
const aggregateCache = new Map<string, AggregateCacheEntry>()
const CACHE_TTL_MS = 60_000
// Track seeding in-flight to avoid duplicate concurrent seed operations per locale
const seedingInFlight = new Map<string, Promise<boolean>>()

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

// Seed database with initial static content if empty. Returns true if seeding performed.
export async function seedIfEmpty(locale: string, data: CvData, design: CvDesign): Promise<boolean> {
  if (!canUseDatabase()) return false
  if (seedingInFlight.has(locale)) {
  return seedingInFlight.get(locale)!
  }
  const task: Promise<boolean> = (async (): Promise<boolean> => {
    try {
      const client = getPrisma()
      const existing = await client.person.findUnique({ where: { locale } })
      if (existing) return false
      // Person
      await client.person.create({
        data: {
          locale,
          name: data.person.name,
          title: data.person.title,
          profile: data.person.profile,
          email: data.person.contact.email,
          location: data.person.contact.location ?? null,
          phone: data.person.contact.phone ?? null,
          website: data.person.contact.website ?? null,
          github: data.person.contact.github ?? null,
          linkedin: data.person.contact.linkedin ?? null,
          twitter: data.person.contact.twitter ?? null,
          linksJson: JSON.stringify(data.person.links ?? [])
        }
      })
      // Skills
      if (data.skills?.length) {
        type SeedSkill = CvData['skills'][number]
        await client.skill.createMany({
          data: data.skills.map((s: SeedSkill) => ({
            id: s.id,
            locale,
            name: s.name,
            category: s.category ?? null,
            level: s.level ?? null,
            years: hasYears(s) ? (s.years ?? null) : null,
            tagsJson: s.tags ? JSON.stringify(s.tags) : undefined
          }))
        })
      }
      // Projects
      if (data.projects?.length) {
        // createMany lacks relations beyond simple columns
        type SeedProject = CvData['projects'][number]
        await client.project.createMany({
          data: data.projects.map((p: SeedProject) => ({
            id: p.id,
            locale,
            title: p.title,
            role: p.role,
            period: p.period,
            company: p.company ?? null,
            summary: p.summary,
            highlightsJson: JSON.stringify(p.highlights ?? []),
            stackJson: JSON.stringify(p.stack ?? []),
            impact: p.impact ?? null,
            linksJson: p.links ? JSON.stringify(p.links) : undefined
          }))
        })
      }
      // Design
      await client.design.upsert({
        where: { locale },
        update: {
          pageJson: JSON.stringify(design.page),
          paletteJson: JSON.stringify(design.palette),
          typographyJson: JSON.stringify(design.typography),
          shapesJson: JSON.stringify(design.shapes),
          sectionsJson: JSON.stringify(design.sections)
        },
        create: {
          locale,
          pageJson: JSON.stringify(design.page),
          paletteJson: JSON.stringify(design.palette),
          typographyJson: JSON.stringify(design.typography),
          shapesJson: JSON.stringify(design.shapes),
          sectionsJson: JSON.stringify(design.sections)
        }
      })
      invalidateAggregateCache(locale)
      return true
    } catch (e) {
      log.warn({ err: e }, 'seedIfEmpty failed')
      return false
    } finally {
      seedingInFlight.delete(locale)
    }
  })()
  seedingInFlight.set(locale, task)
  return task
}

async function loadFromDb(locale: string) {
  // Fast path: if DATABASE_URL is not configured or clearly invalid, avoid initializing Prisma
  if (!canUseDatabase()) return null
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

// Narrow person to only needed fields; arrays already use Prisma model types with JSON column fields present.
interface PersonRow { name: string; title: string; profile: string; email: string; location: string | null; phone: string | null; website: string | null; github: string | null; linkedin: string | null; twitter: string | null; linksJson: string | null }

function mapRowsToData(rows: { person: PersonRow; skills: Skill[]; projects: Project[]; experiences: Experience[]; education: Education[]; certifications: Certification[]; traits: Trait[]; hobbies: Hobby[] }) {
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
    skills: rows.skills.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      level: s.level ?? undefined,
      years: s.years ?? undefined,
      tags: safeJson<Record<string, string>[] | string[] | undefined>(s.tagsJson, undefined)
    })),
    projects: rows.projects.map(p => ({
      id: p.id,
      title: p.title,
      role: p.role,
      period: p.period,
      company: p.company ?? undefined,
      summary: p.summary,
      highlights: safeJson<string[]>(p.highlightsJson, []),
      stack: safeJson<string[]>(p.stackJson, []),
      impact: p.impact ?? undefined,
      links: safeJson<Record<string, string>[] | undefined>(p.linksJson, undefined)
    })),
    experiences: rows.experiences.map(e => ({
      id: e.id,
      company: e.company,
      role: e.role,
      period: e.period,
      location: e.location ?? undefined,
      employmentType: e.employmentType ?? undefined,
      summary: e.summary ?? undefined,
      achievements: safeJson<string[]>(e.achievementsJson, []),
      stack: safeJson<string[]>(e.stackJson, []),
      tags: safeJson<string[]>(e.tagsJson, [])
    })),
    education: rows.education.map(ed => ({
      id: ed.id,
      institution: ed.institution,
      degree: ed.degree,
      field: ed.field ?? undefined,
      period: ed.period,
      location: ed.location ?? undefined,
      grade: ed.grade ?? undefined,
      summary: ed.summary ?? undefined,
      highlights: safeJson<string[]>(ed.highlightsJson, [])
    })),
    certifications: rows.certifications.map(c => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      year: c.year ?? undefined,
      url: c.url ?? undefined
    })),
    traits: rows.traits.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description ?? undefined,
      category: t.category ?? undefined
    })),
    hobbies: rows.hobbies.map(h => ({
      id: h.id,
      name: h.name,
      description: h.description ?? undefined
    }))
  })
}

// Type guard for optional years property on incoming seed skills (schema may not declare it explicitly)
function hasYears(value: unknown): value is { years?: number | null } {
  return typeof value === 'object' && value !== null && 'years' in value && (value as { years?: unknown }).years !== undefined
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
    page: { size: CV_PAGE_SIZE, margin: CV_PAGE_MARGIN, columns: CV_PAGE_COLUMNS, gutter: CV_PAGE_GUTTER },
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

