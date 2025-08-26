import { describe, it, expect } from 'vitest'
import { CvDataSchema, CvSelectionSchema } from '../lib/cv/schema'
import { sampleCvData } from '../lib/cv/sample-data'

describe('CV extended schema', () => {
  it('parses sample data with extended optional arrays', () => {
    const parsed = CvDataSchema.parse(sampleCvData)
    expect(parsed.experiences?.length).toBeGreaterThan(0)
    expect(parsed.education?.[0].institution).toBeDefined()
    expect(parsed.certifications?.[0].issuer).toBe('CNCF')
    expect(parsed.traits?.[0].name).toBe('Systems Thinking')
    expect(parsed.hobbies?.[0].name).toBe('Climbing')
  })

  it('transforms selection csv strings to string arrays', () => {
    const sel = CvSelectionSchema.parse({ skills: 'ts,react', projects: 'edge-cdn', experiences: 'exp-acme', education: 'edu-bs' })
    expect(sel.skills).toEqual(['ts','react'])
    expect(sel.projects).toEqual(['edge-cdn'])
    expect(sel.experiences).toEqual(['exp-acme'])
    expect(sel.education).toEqual(['edu-bs'])
  })

  it('allows empty optional collections', () => {
    const minimal = CvDataSchema.parse({ person: sampleCvData.person, skills: sampleCvData.skills, projects: sampleCvData.projects })
    expect(minimal.experiences).toBeUndefined()
  })
})
