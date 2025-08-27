import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Use a unique sqlite file so it doesn't interfere with other tests
const dbFile = path.join(process.cwd(), 'test-cv-fallback.sqlite')
process.env.DATABASE_URL = `file:${dbFile}`

import { PrismaClient } from '@prisma/client'
import { getAggregate } from '@/lib/cv/service'

const prisma = new PrismaClient()

beforeAll(async () => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
  execSync('npx prisma db push', { stdio: 'ignore' })
  // Seed person but INVALID design (bad page size + shapes/sections objects instead of arrays) to force design parse failure
  await prisma.person.create({ data: { locale: 'en', name: 'Fallback Joe', title: 'Engineer', profile: 'Profile', email: 'fb@example.com' } })
  const badDesign = {
    page: { size: 'LETTER' }, // invalid literal (expects 'A4')
    palette: {}, // missing required fields
    typography: {},
    shapes: {}, // should be array
    sections: {} // should be array
  }
  await prisma.design.create({ data: {
    locale: 'en',
    pageJson: JSON.stringify(badDesign.page),
    paletteJson: JSON.stringify(badDesign.palette),
    typographyJson: JSON.stringify(badDesign.typography),
    shapesJson: JSON.stringify(badDesign.shapes),
    sectionsJson: JSON.stringify(badDesign.sections)
  } })
})

describe('cv service fallback path', () => {
  it('falls back to static when design parse fails', async () => {
    const { source, data } = await getAggregate('en')
    expect(source).toBe('static')
    // Ensure returned name is NOT the seeded DB person (static data has different name)
    expect(data.person.name).not.toBe('Fallback Joe')
  })
})
