import { describe, it, expect } from 'vitest'
import { CvSelectionSchema } from '@/lib/cv/schema'

describe('CvSelectionSchema', () => {
  it('parses comma separated skills/projects', () => {
    const result = CvSelectionSchema.parse({ skills: 'a,b,c', projects: 'p1,p2' })
    expect(result.skills).toEqual(['a', 'b', 'c'])
    expect(result.projects).toEqual(['p1', 'p2'])
  })
  it('ignores empty segments', () => {
    const result = CvSelectionSchema.parse({ skills: 'a,,b,' })
    expect(result.skills).toEqual(['a', 'b'])
  })
  it('optional fields undefined when missing', () => {
    const result = CvSelectionSchema.parse({})
    expect(result.skills).toBeUndefined()
  })
})
