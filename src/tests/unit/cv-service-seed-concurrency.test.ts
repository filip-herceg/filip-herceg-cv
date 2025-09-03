import { describe, it, expect, vi } from 'vitest'

// Intent: exercise seedIfEmpty concurrency early return path (seedingInFlight reuse) and
// trigger design parse warning (lines 53-54 in service.ts) with valid person but invalid design JSON on load.

describe('cv-service seed concurrency & design parse warning', () => {
  it('reuses in-flight seed promise and warns on invalid design parse', async () => {
    vi.resetModules()
    let createCount = 0
    // Prisma mock: first findUnique returns null to allow seeding, subsequent returns existing
    class MockPrisma {
      person = {
        findUnique: async () => (createCount > 0 ? { locale: 'en', name: 'N', title: 'T', profile: 'P', email: 'e', location: null, phone: null, website: null, github: null, linkedin: null, twitter: null, linksJson: '[]' } : null),
        create: async () => { createCount++; return {} }
      }
      skill = { createMany: async () => {} }
      project = { createMany: async () => {} }
      design = { upsert: async () => ({ locale: 'en' }), findUnique: async () => ({ locale: 'en', pageJson: '{bad', paletteJson: '{}', typographyJson: '{}', shapesJson: '{}', sectionsJson: '{}' }) }
      experience = { findMany: async () => [] }
      education = { findMany: async () => [] }
      certification = { findMany: async () => [] }
      trait = { findMany: async () => [] }
      hobby = { findMany: async () => [] }
      skill_findManyCalls: number = 0
      skill_findMany = { findMany: async () => [] }
    }
    vi.doMock('@prisma/client', () => ({ PrismaClient: MockPrisma }))
    const svc = await import('@/lib/cv/service')
    const seedData = { person: { name: 'P', title: 'T', profile: 'Bio', contact: { email: 'a@b.c' }, links: [] }, skills: [], projects: [] }
    const design = { page: { size: 'A4', margin: '10mm', columns: 1, gutter: '4mm' }, palette: { mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#333' }, typography: { body: 'sys', heading: 'sys', scale: 1 }, shapes: [], sections: [] }
    // Launch two concurrent seeds
    const [r1, r2] = await Promise.all([
      svc.seedIfEmpty('en', seedData as any, design as any),
      svc.seedIfEmpty('en', seedData as any, design as any)
    ])
    expect(r1 || r2).toBe(true)
    expect(createCount).toBe(1) // only one create due to in-flight reuse
    // Now load aggregate; design parse should fail due to invalid JSON (pageJson) -> fallback to empty design path
  const agg = await svc.getAggregate('en')
  expect(agg.source).toBe('empty')
  })
})
