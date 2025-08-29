import { PrismaClient, type Skill, type Project, type Experience, type Education, type Certification, type Trait, type Hobby } from '@prisma/client'
import { CvDataSchema, CvDesignSchema, type CvData, type CvDesign } from './schema'
import { getCvData as getStaticCvData, getCvDesign as getStaticCvDesign } from './loader'
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
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}
const log = pino({ name: 'cv-service' })

// Simple in-memory cache (locale -> aggregate) to minimize DB round trips.
interface AggregateCacheEntry { data: CvData; design: CvDesign; loadedAt: number }
const aggregateCache = new Map<string, AggregateCacheEntry>()
const CACHE_TTL_MS = 60_000

export async function getAggregate(locale: string = 'en'): Promise<{ data: CvData; design: CvDesign; source: 'db' | 'static' }> {
  const now = Date.now()
  const cached = aggregateCache.get(locale)
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) {
    return { data: cached.data, design: cached.design, source: 'db' }
  }

  // Attempt DB load (Step 1: simplistic approach aggregating all rows)
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

    if (person) {
      const dataParse = CvDataSchema.safeParse({
        person: {
          name: person.name,
          title: person.title,
            profile: person.profile,
            contact: {
              email: person.email,
              location: person.location ?? undefined,
              phone: person.phone ?? undefined,
              website: person.website ?? undefined,
              github: person.github ?? undefined,
              linkedin: person.linkedin ?? undefined,
              twitter: person.twitter ?? undefined
            },
            links: safeJson(person.linksJson, undefined)
        },
  skills: skills.map((s: Skill & { tagsJson?: string | null }) => ({ id: s.id, name: s.name, category: s.category, level: s.level ?? undefined, years: (s as Skill & { years?: number }).years ?? undefined, tags: safeJson<Record<string,string>[] | string[] | undefined>(s.tagsJson, undefined) })),
  projects: projects.map((p: Project & { highlightsJson?: string | null; stackJson?: string | null; impact?: string | null; linksJson?: string | null; company?: string | null }) => ({ id: p.id, title: p.title, role: p.role, period: p.period, company: p.company ?? undefined, summary: p.summary, highlights: safeJson<string[]>(p.highlightsJson, []), stack: safeJson<string[]>(p.stackJson, []), impact: p.impact ?? undefined, links: safeJson<Record<string,string>[] | undefined>(p.linksJson, undefined) })),
  experiences: experiences.map((e: Experience & { location?: string | null; employmentType?: string | null; summary?: string | null; achievementsJson?: string | null; stackJson?: string | null; tagsJson?: string | null }) => ({ id: e.id, company: e.company, role: e.role, period: e.period, location: e.location ?? undefined, employmentType: e.employmentType ?? undefined, summary: e.summary ?? undefined, achievements: safeJson<string[]>(e.achievementsJson, []), stack: safeJson<string[]>(e.stackJson, []), tags: safeJson<string[]>(e.tagsJson, [] ) })),
  education: education.map((ed: Education & { field?: string | null; location?: string | null; grade?: string | null; summary?: string | null; highlightsJson?: string | null }) => ({ id: ed.id, institution: ed.institution, degree: ed.degree, field: ed.field ?? undefined, period: ed.period, location: ed.location ?? undefined, grade: ed.grade ?? undefined, summary: ed.summary ?? undefined, highlights: safeJson<string[]>(ed.highlightsJson, []) })),
  certifications: certifications.map((c: Certification & { year?: number | null; url?: string | null }) => ({ id: c.id, name: c.name, issuer: c.issuer, year: c.year ?? undefined, url: c.url ?? undefined })),
  traits: traits.map((t: Trait & { description?: string | null; category?: string | null }) => ({ id: t.id, name: t.name, description: t.description ?? undefined, category: t.category ?? undefined })),
  hobbies: hobbies.map((h: Hobby & { description?: string | null }) => ({ id: h.id, name: h.name, description: h.description ?? undefined }))
      })

      const designParse = design ? CvDesignSchema.safeParse({
        page: safeJson(design.pageJson, {}),
        palette: safeJson(design.paletteJson, {}),
        typography: safeJson(design.typographyJson, {}),
        shapes: safeJson(design.shapesJson, {}),
        sections: safeJson(design.sectionsJson, {})
      }) : null

      if (dataParse.success && designParse?.success) {
        const entry: AggregateCacheEntry = { data: dataParse.data, design: designParse.data, loadedAt: now }
        aggregateCache.set(locale, entry)
        return { data: entry.data, design: entry.design, source: 'db' }
      } else {
        if (!dataParse.success) log.warn({ err: dataParse.error }, 'cv data parse failed from db')
        if (designParse && !designParse.success) log.warn({ err: designParse.error }, 'cv design parse failed from db')
      }
    }
  } catch (e) {
    log.warn({ err: e }, 'db load failed; falling back to static')
  }

  // Fallback to static bootstrap (temporary until DB seeded)
  const staticData = getStaticCvData('en')
  const staticDesign = getStaticCvDesign('en')
  return { data: staticData, design: staticDesign, source: 'static' }
}
