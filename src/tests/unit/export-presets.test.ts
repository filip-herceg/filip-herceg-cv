import { describe, it, expect } from 'vitest'
import { ExportConfigInputSchema } from '@/lib/export/schema'
import { buildComprehensivePreset, buildConcisePreset, buildLeadershipPreset, buildTechnicalPreset } from '@/lib/export/presets'

describe('export presets', () => {
  it('comprehensive preset validates and includes broad sections', () => {
    const cfg = buildComprehensivePreset()
    const parsed = ExportConfigInputSchema.safeParse(cfg)
    expect(parsed.success).toBe(true)
    const keys = cfg.sections.map(s => s.key)
    expect(keys.slice(0, 2)).toEqual(['PROFILE', 'SKILLS'])
    expect(keys).toContain('PROJECTS')
    expect(keys).toContain('EXPERIENCE')
    expect(keys).toContain('CONTACT')
  })

  it('concise preset is compact and time-filtered', () => {
    const cfg = buildConcisePreset()
    const parsed = ExportConfigInputSchema.safeParse(cfg)
    expect(parsed.success).toBe(true)
    expect(cfg.density).toBe('compact')
    expect(cfg.filters?.projectSinceYear).toBeTypeOf('number')
    expect(cfg.filters?.experienceSinceYear).toBeTypeOf('number')
    expect(cfg.sections.find(s=>s.key==='SKILLS')?.limit).toBeGreaterThanOrEqual(8)
  })

  it('leadership preset favors leadership tags', () => {
    const cfg = buildLeadershipPreset()
    const parsed = ExportConfigInputSchema.safeParse(cfg)
    expect(parsed.success).toBe(true)
    const exp = cfg.sections.find(s=>s.key==='EXPERIENCE')
    expect(exp?.tags).toBeDefined()
    expect(exp?.tags).toContain('leadership')
  })

  it('technical preset focuses on engineering stacks and compact density', () => {
    const cfg = buildTechnicalPreset()
    const parsed = ExportConfigInputSchema.safeParse(cfg)
    expect(parsed.success).toBe(true)
    expect(cfg.density).toBe('compact')
    const proj = cfg.sections.find(s=>s.key==='PROJECTS')
    expect(proj?.tags?.length).toBeGreaterThanOrEqual(1)
  })
})
