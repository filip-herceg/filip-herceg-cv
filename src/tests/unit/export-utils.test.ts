import { describe, it, expect } from 'vitest'
import { projectExport, skillsToCsv, buildTextSummary, toJsonResume } from '@/lib/cv/export'
import { encodePreset } from '@/lib/cv/permalink'

describe('export utilities', () => {
  it('projects full data without selection', async () => {
    const { data } = await projectExport()
    expect(data.version).toBe(1)
    expect(data.skills.length).toBeGreaterThan(0)
  })
  it('applies selection from cv token', async () => {
    const token = await encodePreset({ skills: ['ts'], projects: ['obs-platform'], mode: 'short' })
    const { data } = await projectExport({ cvToken: token })
    expect(data.skills.every(s => s.id === 'ts')).toBe(true)
    expect(data.projects.every(p => p.id === 'obs-platform')).toBe(true)
    expect(data.selection?.skills).toEqual(['ts'])
  })
  it('redacts email in public mode', async () => {
    const { data } = await projectExport({ publicMode: true })
  expect((data.person as any).contact.email).toBeUndefined()
    expect(data.redactions).toContain('person.contact.email')
  })
  it('serializes skills to CSV', async () => {
    const { data } = await projectExport()
    const csv = skillsToCsv(data.skills)
    expect(csv.split('\n').length).toBeGreaterThan(2)
    expect(csv).toMatch(/id,name/)
  })
  it('builds text summary', async () => {
    const { data } = await projectExport()
    const txt = buildTextSummary(data)
    expect(txt).toMatch(/Skills:/)
  })
  it('maps to json resume shape', async () => {
    const { data } = await projectExport()
    const jr = toJsonResume(data)
    expect(jr.basics.name).toBeDefined()
    expect(Array.isArray(jr.skills)).toBe(true)
  })
})
