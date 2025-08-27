import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Unique sqlite for cache test
const dbFile = path.join(process.cwd(), 'test-cv-cache.sqlite')
process.env.DATABASE_URL = `file:${dbFile}`

import { PrismaClient } from '@prisma/client'
import { getAggregate } from '@/lib/cv/service'

const prisma = new PrismaClient()

beforeAll(async () => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
  execSync('npx prisma db push', { stdio: 'ignore' })
  // Seed valid data + design
  await prisma.person.create({ data: { locale: 'en', name: 'Cache Alice', title: 'Engineer', profile: 'Profile', email: 'cache@example.com' } })
  const page = { size: 'A4', margin: '1cm', columns: 2, gutter: '12pt' }
  const palette = { mode: 'light', primary: '#111', accent: '#09f', background: '#fff', surface: '#f5f5f5', text: '#111', mutedText: '#555' }
  const typography = { body: 'Inter', heading: 'Inter', scale: 1 }
  const shapes: any[] = []
  const sections = [ { id: 'skills', label: 'Skills', order: 1, enabled: true } ]
  await prisma.design.create({ data: { locale: 'en', pageJson: JSON.stringify(page), paletteJson: JSON.stringify(palette), typographyJson: JSON.stringify(typography), shapesJson: JSON.stringify(shapes), sectionsJson: JSON.stringify(sections) } })
})

describe('cv service cache', () => {
  it('returns cached aggregate within TTL even after DB update', async () => {
    const first = await getAggregate('en')
    expect(first.source).toBe('db')
    expect(first.data.person.name).toBe('Cache Alice')
    // Update underlying DB
    await prisma.person.update({ where: { locale: 'en' }, data: { name: 'Cache Alice Updated' } })
    // Second call should hit in-memory cache and still show old name
    const second = await getAggregate('en')
    expect(second.data.person.name).toBe('Cache Alice')
  })
})
