import { describe, it, expect } from 'vitest'
import { deriveSelection, selectionToQueryParams, selectionHashParts } from '@/lib/export/selector'
import type { CvData } from '@/lib/cv/schema'
import type { ExportConfigInput } from '@/lib/export/schema'

const basePerson = {
  name: 'Test User',
  title: 'Engineer',
  profile: 'Profile',
  contact: { email: 'test@example.com' },
}

function makeData(): CvData {
  const raw = {
    person: basePerson,
    skills: [
      { id: 's1', name: 'TypeScript', category: 'Language', tags: ['frontend', 'typed'] },
      { id: 's2', name: 'Node.js', category: 'Platform', tags: ['backend'] },
      { id: 's3', name: 'React', category: 'Library', tags: ['frontend'] },
    ],
    projects: [
      { id: 'p1', title: 'Obs Platform', role: 'Lead', period: '2019 – 2021', summary: 'x', highlights: [], stack: ['node', 'react'] },
      { id: 'p2', title: 'Legacy Revamp', role: 'Dev', period: '2014', summary: 'x', highlights: [], stack: ['php'] },
      // no stack should not be excluded when tags provided (guard branch)
      { id: 'p3', title: 'No Stack', role: 'Dev', period: '2023', summary: 'x', highlights: [] },
    ],
    experiences: [
      { id: 'e1', company: 'A', role: 'SWE', period: '2018 – 2020', achievements: [], stack: ['node', 'k8s'] },
      { id: 'e2', company: 'B', role: 'SWE', period: '2016 – 2017', achievements: [], stack: ['java'] },
      { id: 'e3', company: 'C', role: 'SWE', period: '2022', achievements: [], /* no stack */ },
    ],
    // education lacks tags in schema; we inject tags in test to exercise branch
    education: [
      { id: 'ed1', institution: 'Uni', degree: 'CS', field: 'CS', period: '2010 – 2014' },
      { id: 'ed2', institution: 'Bootcamp', degree: 'Cert', period: '2019', tags: ['cs'] },
    ],
  }
  // cast via unknown to allow intentionally missing optional fields like stack/tags for branch coverage
  return raw as unknown as CvData
}

describe('export selection deriveSelection', () => {
  it('filters by tags/stack and year limits, then applies per-section limits', () => {
  const cfg: ExportConfigInput = {
      name: 't',
      sections: [
    { key: 'SKILLS', tags: ['frontend'], limit: 1 },
    { key: 'PROJECTS', tags: ['react'], limit: 1 },
    { key: 'EXPERIENCE', tags: ['node'], limit: 2 },
    { key: 'EDUCATION', tags: ['cs'], limit: 1 },
      ],
      filters: { projectSinceYear: 2015, experienceSinceYear: 2018 },
      density: 'compact' as const,
      colorMode: 'auto' as const,
      paperSize: 'A4' as const,
    }

    const data = makeData()
    const sel = deriveSelection(cfg, data)

    // Skills: only those with frontend tag, limit 1
    expect(sel.skills.map(s => s.id)).toEqual(['s1'])

    // Projects: p1 matches react and year >= 2015; p2 filtered out by year; p3 has no stack so passes tag check but also passes year, but limit=1 keeps first match
    expect(sel.projects.map(p => p.id)).toEqual(['p1'])

    // Experience: e1 matches node and year >= 2018; e2 filtered by year; e3 has no stack -> allowed by tag guard, and year 2022 -> included; limit 2 keeps e1,e3
    expect(sel.experiences.map(e => e.id)).toEqual(['e1', 'e3'])

  // Education: items without tags are not excluded; with limit 1 it keeps first entry
  expect(sel.education?.map(ed => ed.id)).toEqual(['ed1'])

    // selectionToQueryParams should include mode=short when density=compact
    const params = selectionToQueryParams(cfg, sel)
    expect(params.mode).toBe('short')
    expect(params.skills).toBe('s1')
    expect(params.projects).toBe('p1')
    expect(params.experiences).toBe('e1,e3')
  expect(params.education).toBe('ed1')

    // hash parts are lengths as strings
    expect(selectionHashParts(sel)).toEqual(['1','1','2','1'])
  })

  it('handles missing experiences array and no tags gracefully', () => {
  const cfg: ExportConfigInput = {
      name: 'no-tags',
      sections: [
    { key: 'SKILLS' },
    { key: 'PROJECTS' },
    { key: 'EXPERIENCE' },
    { key: 'EDUCATION' },
      ],
      density: 'normal' as const,
      colorMode: 'auto' as const,
      paperSize: 'A4' as const,
    }
    const data = makeData()
    // drop experiences to hit baseExperiences=[] branch
    const dataNoExp = { ...data, experiences: undefined }
    const sel = deriveSelection(cfg, dataNoExp)
    expect(sel.experiences).toEqual([])
    // Without tags or limits, arrays pass through
    expect(sel.projects.length).toBe(data.projects.length)
    expect(sel.skills.length).toBe(data.skills.length)
  })
})
