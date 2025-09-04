import type { ExportConfigInput } from './schema'
import type { CvData } from '@/lib/cv/schema'

export interface ExportSelection {
  skills: CvData['skills']
  projects: CvData['projects']
  experiences: NonNullable<CvData['experiences']>
  education?: NonNullable<CvData['education']>
}

interface SectionCfg { key: string; limit?: number; tags?: string[] }

/**
 * Derive a filtered, limited selection from full CV data according to export config.
 * Current filters: projectSinceYear, experienceSinceYear, per-section limits, density (mode only).
 */
export function deriveSelection(cfg: ExportConfigInput, data: CvData): ExportSelection {
  const sectionMap = new Map<string, SectionCfg>(cfg.sections.map((s) => [s.key.toUpperCase(), s]))
  const filters = cfg.filters || {}
  const applyLimit = <T>(arr: T[] | undefined, limit?: number): T[] | undefined => (!arr || !limit || limit <= 0 ? arr : arr.slice(0, limit))

  // Projects
  let projects = data.projects
  if (filters.projectSinceYear) {
    projects = projects.filter(p => {
      const match = /^(\d{4})/.exec(p.period)
      const yr = match ? parseInt(match[1], 10) : undefined
      return !yr || yr >= filters.projectSinceYear!
    })
  }
  projects = applyLimit(projects, sectionMap.get('PROJECTS')?.limit) || []

  // Experience
  const baseExperiences: NonNullable<CvData['experiences']> = Array.isArray(data.experiences) ? [...data.experiences] as NonNullable<CvData['experiences']> : []
  let experiences = baseExperiences
  if (filters.experienceSinceYear) {
    experiences = experiences.filter(e => {
      const match = /^(\d{4})/.exec(e.period)
      const yr = match ? parseInt(match[1], 10) : undefined
      return !yr || yr >= filters.experienceSinceYear!
    })
  }
  experiences = applyLimit(experiences, sectionMap.get('EXPERIENCE')?.limit) || []

  // Skills
  const skills = applyLimit(data.skills, sectionMap.get('SKILLS')?.limit) || []

  // Education
  const education = applyLimit(data.education, sectionMap.get('EDUCATION')?.limit) || data.education

  return { skills, projects, experiences, education }
}

export function selectionToQueryParams(cfg: ExportConfigInput, sel: ExportSelection): Record<string,string> {
  const params: Record<string,string> = {}
  if (sel.skills.length) params.skills = sel.skills.map(s => s.id).join(',')
  if (sel.projects.length) params.projects = sel.projects.map(p => p.id).join(',')
  if (sel.experiences.length) params.experiences = sel.experiences.map(e => e.id).join(',')
  if (sel.education?.length) params.education = sel.education.map(ed => ed.id).join(',')
  if (cfg.density === 'compact') params.mode = 'short'
  return params
}

export function selectionHashParts(sel: ExportSelection): string[] {
  return [
    String(sel.skills.length),
    String(sel.projects.length),
    String(sel.experiences.length),
    String(sel.education?.length ?? 0)
  ]
}