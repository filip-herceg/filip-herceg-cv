#!/usr/bin/env node
/* eslint-disable no-console */
// One-off migration script: copy data from SQLite (LEGACY_SQLITE_URL) to Postgres (DATABASE_URL)
// Usage: LEGACY_SQLITE_URL="file:./dev.db" DATABASE_URL="postgresql://..." node scripts/migrate-sqlite-to-postgres.mjs
import { PrismaClient as PgClient } from '@prisma/client'
// Dynamically load a second Prisma client bound to SQLite by overriding env at runtime.

async function main() {
  const legacyUrl = process.env.LEGACY_SQLITE_URL
  if (!legacyUrl) throw new Error('LEGACY_SQLITE_URL missing')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing')

  console.log('Starting data copy from SQLite -> Postgres')
  // Create a second client instance pointing to legacy URL via runtime API (undocumented but workable using $extends soon) – fallback: spawn child process.
  // Simpler: temporarily override process.env.DATABASE_URL and instantiate, then restore.
  const original = process.env.DATABASE_URL
  process.env.DATABASE_URL = legacyUrl
  const sqlite = new PgClient()
  process.env.DATABASE_URL = original
  const pg = new PgClient()

  const locale = 'en'
  const person = await sqlite.person.findUnique({ where: { locale } })
  if (!person) { console.log('No person row found; nothing to migrate'); return }
  const [skills, projects, experiences, education, certifications, traits, hobbies, design] = await Promise.all([
    sqlite.skill.findMany({ where: { locale } }),
    sqlite.project.findMany({ where: { locale } }),
    sqlite.experience.findMany({ where: { locale } }),
    sqlite.education.findMany({ where: { locale } }),
    sqlite.certification.findMany({ where: { locale } }),
    sqlite.trait.findMany({ where: { locale } }),
    sqlite.hobby.findMany({ where: { locale } }),
    sqlite.design.findUnique({ where: { locale } })
  ])

  // Idempotency: skip if target already has person
  const exists = await pg.person.findUnique({ where: { locale } })
  if (exists) { console.log('Target already populated; abort'); return }

  await pg.$transaction(async tx => {
    await tx.person.create({ data: person })
    if (skills.length) await tx.skill.createMany({ data: skills })
    if (projects.length) await tx.project.createMany({ data: projects })
    if (experiences.length) await tx.experience.createMany({ data: experiences })
    if (education.length) await tx.education.createMany({ data: education })
    if (certifications.length) await tx.certification.createMany({ data: certifications })
    if (traits.length) await tx.trait.createMany({ data: traits })
    if (hobbies.length) await tx.hobby.createMany({ data: hobbies })
    if (design) await tx.design.create({ data: design })
  })

  console.log('Migration complete:')
  console.table({ skills: skills.length, projects: projects.length, experiences: experiences.length })
  await Promise.all([sqlite.$disconnect(), pg.$disconnect()])
}

main().catch(e => { console.error(e); process.exit(1) })