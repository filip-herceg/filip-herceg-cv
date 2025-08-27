import { PrismaClient } from '@prisma/client'
import { CvDataSchema, CvDesignSchema, type CvData, type CvDesign } from './schema'
import { getCvData as getStaticCvData, getCvDesign as getStaticCvDesign } from './loader'
import pino from 'pino'

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
            links: person.linksJson ? JSON.parse(person.linksJson) : undefined
        },
  skills: skills.map((s: any) => ({ id: s.id, name: s.name, category: s.category, level: s.level ?? undefined, years: s.years ?? undefined, tags: s.tagsJson ? JSON.parse(s.tagsJson) : undefined })),
  projects: projects.map((p: any) => ({ id: p.id, title: p.title, role: p.role, period: p.period, company: p.company ?? undefined, summary: p.summary, highlights: p.highlightsJson ? JSON.parse(p.highlightsJson) : [], stack: p.stackJson ? JSON.parse(p.stackJson) : [], impact: p.impact ?? undefined, links: p.linksJson ? JSON.parse(p.linksJson) : undefined })),
  experiences: experiences.map((e: any) => ({ id: e.id, company: e.company, role: e.role, period: e.period, location: e.location ?? undefined, employmentType: e.employmentType ?? undefined, summary: e.summary ?? undefined, achievements: e.achievementsJson ? JSON.parse(e.achievementsJson) : [], stack: e.stackJson ? JSON.parse(e.stackJson) : [], tags: e.tagsJson ? JSON.parse(e.tagsJson) : [] })),
  education: education.map((ed: any) => ({ id: ed.id, institution: ed.institution, degree: ed.degree, field: ed.field ?? undefined, period: ed.period, location: ed.location ?? undefined, grade: ed.grade ?? undefined, summary: ed.summary ?? undefined, highlights: ed.highlightsJson ? JSON.parse(ed.highlightsJson) : [] })),
  certifications: certifications.map((c: any) => ({ id: c.id, name: c.name, issuer: c.issuer, year: c.year ?? undefined, url: c.url ?? undefined })),
  traits: traits.map((t: any) => ({ id: t.id, name: t.name, description: t.description ?? undefined, category: t.category ?? undefined })),
  hobbies: hobbies.map((h: any) => ({ id: h.id, name: h.name, description: h.description ?? undefined }))
      })

      const designParse = design ? CvDesignSchema.safeParse({
        page: JSON.parse(design.pageJson),
        palette: JSON.parse(design.paletteJson),
        typography: JSON.parse(design.typographyJson),
        shapes: JSON.parse(design.shapesJson),
        sections: JSON.parse(design.sectionsJson)
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
