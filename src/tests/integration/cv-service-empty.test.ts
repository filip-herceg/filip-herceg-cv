import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Use a unique sqlite file so it doesn't interfere with other tests
const dbFile = path.join(process.cwd(), 'test-cv-empty.sqlite')
process.env.DATABASE_URL = `file:${dbFile}`

import { getAggregate } from '@/lib/cv/service'

  // prisma client intentionally not referenced directly; service handles its own access

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
  try { execSync('npx prisma db push', { stdio: 'ignore' }) } catch { /* ignore */ }
  // Intentionally DO NOT seed any person or design rows -> expect empty onboarding state
})

describe('cv service empty onboarding state', () => {
  it('returns empty source with placeholder person when DB uninitialized', async () => {
    const { source, data, design } = await getAggregate('en')
    expect(source).toBe('empty')
    expect(data.person.name).toBe('Your Name')
    expect(Array.isArray(data.skills)).toBe(true)
    expect(Array.isArray(data.projects)).toBe(true)
    expect(design.sections.some(s => s.id === 'profile')).toBe(true)
  })
})
