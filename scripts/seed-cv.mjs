#!/usr/bin/env node
/* eslint-disable no-console */
// Seed script: imports current static JSON CV data into the database (locale 'en') if empty.
import { PrismaClient } from '@prisma/client'
import cvData from '../src/lib/cv/data/cv.en.json' assert { type: 'json' }
import cvDesign from '../src/lib/cv/data/design.en.json' assert { type: 'json' }

const prisma = new PrismaClient()
const locale = 'en'

async function main() {
  const existing = await prisma.person.findUnique({ where: { locale } })
  if (existing) {
  process.stdout.write(`Seed skipped: person row already exists for locale ${locale}\n`)
    return
  }
  process.stdout.write(`Seeding CV data for locale ${locale}\n`)
  await prisma.person.create({ data: {
    locale,
    name: cvData.person.name,
    title: cvData.person.title,
    profile: cvData.person.profile,
    email: cvData.person.contact.email,
    location: cvData.person.contact.location || null,
    phone: cvData.person.contact.phone || null,
    website: cvData.person.contact.website || null,
    github: cvData.person.contact.github || null,
    linkedin: cvData.person.contact.linkedin || null,
    twitter: cvData.person.contact.twitter || null,
    linksJson: cvData.person.links ? JSON.stringify(cvData.person.links) : null
  } })

  for (const s of cvData.skills) {
    await prisma.skill.create({ data: { id: s.id, locale, name: s.name, category: s.category, level: s.level || null, years: s.years ?? null, tagsJson: s.tags ? JSON.stringify(s.tags) : null } })
  }
  for (const p of cvData.projects) {
    await prisma.project.create({ data: { id: p.id, locale, title: p.title, role: p.role, period: p.period, company: p.company || null, summary: p.summary, highlightsJson: JSON.stringify(p.highlights || []), stackJson: JSON.stringify(p.stack || []), impact: p.impact || null, linksJson: p.links ? JSON.stringify(p.links) : null } })
  }
  for (const e of cvData.experiences || []) {
    await prisma.experience.create({ data: { id: e.id, locale, company: e.company, role: e.role, period: e.period, location: e.location || null, employmentType: e.employmentType || null, summary: e.summary || null, achievementsJson: JSON.stringify(e.achievements || []), stackJson: JSON.stringify(e.stack || []), tagsJson: JSON.stringify(e.tags || []) } })
  }
  for (const ed of cvData.education || []) {
    await prisma.education.create({ data: { id: ed.id, locale, institution: ed.institution, degree: ed.degree, field: ed.field || null, period: ed.period, location: ed.location || null, grade: ed.grade || null, summary: ed.summary || null, highlightsJson: JSON.stringify(ed.highlights || []) } })
  }
  for (const c of cvData.certifications || []) {
    await prisma.certification.create({ data: { id: c.id, locale, name: c.name, issuer: c.issuer, year: c.year || null, url: c.url || null } })
  }
  for (const t of cvData.traits || []) {
    await prisma.trait.create({ data: { id: t.id, locale, name: t.name, description: t.description || null, category: t.category || null } })
  }
  for (const h of cvData.hobbies || []) {
    await prisma.hobby.create({ data: { id: h.id, locale, name: h.name, description: h.description || null } })
  }

  await prisma.design.create({ data: {
    locale,
    pageJson: JSON.stringify(cvDesign.page),
    paletteJson: JSON.stringify(cvDesign.palette),
    typographyJson: JSON.stringify(cvDesign.typography),
    shapesJson: JSON.stringify(cvDesign.shapes),
    sectionsJson: JSON.stringify(cvDesign.sections)
  } })

  process.stdout.write('Seed complete\n')
}

main().catch(e => { process.stderr.write(String(e) + '\n'); process.exit(1) }).finally(() => prisma.$disconnect())