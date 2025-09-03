import { describe, it, expect, vi } from 'vitest'

// Covers service.ts getAggregate early cache return branch + db source metric path avoidance on cache hit

describe('cv-service cache early return', () => {
  it('returns cached aggregate without second db load', async () => {
    vi.resetModules()
    // Mock prisma so that a second call would show up if cache missed
    const personRow = { locale: 'en', name: 'Alice', title: 'Engineer', profile: 'Hello', email: 'a@example.com', location: null, phone: null, website: null, github: null, linkedin: null, twitter: null, linksJson: null }
    const designRow = {
      locale: 'en',
      pageJson: JSON.stringify({ size: 'A4', margin: '1cm', columns: 2, gutter: '1rem' }),
      paletteJson: JSON.stringify({ mode: 'light', primary: '#000', accent: '#111', background: '#fff', surface: '#eee', text: '#000', mutedText: '#555' }),
      typographyJson: JSON.stringify({ body: 'system-ui', heading: 'system-ui', scale: 1 }),
      shapesJson: '[]',
      sectionsJson: JSON.stringify([{ id: 'profile', label: 'Profile', order: 1, enabled: true }])
    }
    const personFind = vi.fn().mockResolvedValue(personRow)
    const designFind = vi.fn().mockResolvedValue(designRow)
    vi.doMock('@prisma/client', () => ({
      PrismaClient: class { person = { findUnique: personFind }; skill={ findMany: vi.fn().mockResolvedValue([])}; project={ findMany: vi.fn().mockResolvedValue([])}; experience={ findMany: vi.fn().mockResolvedValue([])}; education={ findMany: vi.fn().mockResolvedValue([])}; certification={ findMany: vi.fn().mockResolvedValue([])}; trait={ findMany: vi.fn().mockResolvedValue([])}; hobby={ findMany: vi.fn().mockResolvedValue([])}; design={ findUnique: designFind } }
    }))
    // metrics globally mocked in test-setup
    const { getAggregate } = await import('@/lib/cv/service')
    const first = await getAggregate('en')
    expect(first.source).toBe('db')
  const second = await getAggregate('en')
  expect(second.source).toBe('db')
  expect(personFind).toHaveBeenCalledTimes(1)
  })
})
