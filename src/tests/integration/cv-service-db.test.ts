import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// We dynamically set DATABASE_URL before importing the service to force DB path.
const dbFile = path.join(process.cwd(), 'test-cv.sqlite')
process.env.DATABASE_URL = `file:${dbFile}`

// Re-import after env var set
import { PrismaClient } from '@prisma/client'
import { getAggregate } from '@/lib/cv/service'
import { CV_PAGE_SIZE } from '@/lib/constants'

const prisma = new PrismaClient()

beforeAll(async () => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
  // Run prisma migrate deploy if migrations exist; for now we just push schema
  execSync('npx prisma db push', { stdio: 'inherit' })
  // Minimal seed (person + design) so service returns source db
  await prisma.person.create({ data: { locale: 'en', name: 'DB Jane', title: 'Engineer', profile: 'Profile', email: 'db@example.com' } })
  const page = { size: CV_PAGE_SIZE, margin: '1cm', columns: 2, gutter: '12pt' }
  const palette = { mode: 'light', primary: '#111', accent: '#09f', background: '#fff', surface: '#f5f5f5', text: '#111', mutedText: '#555' }
  const typography = { body: 'Inter', heading: 'Inter', scale: 1 }
  const shapes: any[] = []
  const sections = [ { id: 'skills', label: 'Skills', order: 1, enabled: true } ]
  await prisma.design.create({ data: { locale: 'en', pageJson: JSON.stringify(page), paletteJson: JSON.stringify(palette), typographyJson: JSON.stringify(typography), shapesJson: JSON.stringify(shapes), sectionsJson: JSON.stringify(sections) } })
})

describe('cv service db path', () => {
  it('loads from database when records exist', async () => {
    const { data, source } = await getAggregate('en')
    expect(source).toBe('db')
    expect(data.person.name).toBe('DB Jane')
  })
})
