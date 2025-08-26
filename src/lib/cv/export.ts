import { sampleCvData } from './sample-data'
import { decodePreset, selectionFromExpanded } from './permalink'
import { CvDataSchema } from './schema'

// Types
export interface CanonicalExport {
  version: number
  person: typeof sampleCvData.person
  skills: typeof sampleCvData.skills
  projects: typeof sampleCvData.projects
  experiences?: typeof sampleCvData.experiences
  education?: typeof sampleCvData.education
  certifications?: typeof sampleCvData.certifications
  traits?: typeof sampleCvData.traits
  hobbies?: typeof sampleCvData.hobbies
  selection?: { mode?: 'short'; skills?: string[]; projects?: string[] }
  redactions?: string[]
}

interface ProjectedOptions {
  searchParams?: URLSearchParams
  cvToken?: string | null
  publicMode?: boolean
}

export interface ProjectionResult {
  data: CanonicalExport
  etag: string
}

// Stable JSON stringify (keys sorted) for deterministic hashing
function stableStringify(obj: unknown): string {
  if (obj === null) return 'null'
  if (typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']'
  const rec = obj as Record<string, unknown>
  return '{' + Object.keys(rec).sort().map(k => JSON.stringify(k)+ ':' + stableStringify(rec[k])).join(',') + '}'
}

function hashString(str: string): string {
  let h = 0
  for (let i=0;i<str.length;i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0
  return ('00000000' + (h >>> 0).toString(16)).slice(-8)
}

export async function projectExport(opts: ProjectedOptions = {}): Promise<ProjectionResult> {
  const rawData = CvDataSchema.parse(sampleCvData)

  // Determine selection via cv token or expanded params
  let selection: { mode?: 'short'; skills?: string[]; projects?: string[] } | undefined
  if (opts.cvToken) {
    const decoded = await decodePreset(opts.cvToken)
    if (decoded.ok) {
      selection = { mode: decoded.preset.mode, skills: decoded.preset.skills, projects: decoded.preset.projects }
    }
  } else if (opts.searchParams) {
    const fromExpanded = selectionFromExpanded(opts.searchParams)
    if (Object.keys(fromExpanded).length) selection = { mode: fromExpanded.mode, skills: fromExpanded.skills, projects: fromExpanded.projects }
  }

  // Apply selection filtering (skills/projects only for now)
  let filteredSkills = rawData.skills
  let filteredProjects = rawData.projects
  if (selection?.skills?.length) {
    const set = new Set(selection.skills)
    filteredSkills = filteredSkills.filter(s => set.has(s.id))
  }
  if (selection?.projects?.length) {
    const set = new Set(selection.projects)
    filteredProjects = filteredProjects.filter(p => set.has(p.id))
  }

  const redactions: string[] = []
  const person = { ...rawData.person }
  if (opts.publicMode) {
    // remove email & potentially location for public share
    if ('contact' in person && (person as any).contact?.email) { // eslint-disable-line @typescript-eslint/no-explicit-any
      redactions.push('person.contact.email')
      // @ts-expect-error dynamic redaction
      delete person.contact.email
    }
  }

  const exported: CanonicalExport = {
    version: 1,
    person,
    skills: filteredSkills,
    projects: filteredProjects,
    experiences: rawData.experiences,
    education: rawData.education,
    certifications: rawData.certifications,
    traits: rawData.traits,
    hobbies: rawData.hobbies,
  }
  if (selection) exported.selection = selection
  if (redactions.length) exported.redactions = redactions

  const stable = stableStringify(exported)
  const etag = 'W/"cv-' + hashString(stable) + '"'
  return { data: exported, etag }
}

// CSV serialization (skills)
export function skillsToCsv(skills: typeof sampleCvData.skills): string {
  const header = 'id,name,category,level,years' // years numeric
  const rows = skills.map(s => [s.id, s.name, s.category, s.level, s.years ?? ''].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','))
  return [header, ...rows].join('\n') + '\n'
}

// Plain text ultra-short summary
export function buildTextSummary(data: CanonicalExport): string {
  const parts: string[] = []
  parts.push(`${data.person.name} – ${data.person.title}`)
  const topSkills = data.skills.slice(0, 5).map(s => s.name)
  if (topSkills.length) parts.push('Skills: ' + topSkills.join(', '))
  if (data.projects.length) parts.push('Project: ' + data.projects[0].title + ' – ' + data.projects[0].summary)
  return parts.join('\n') + '\n'
}

// JSON Resume mapping (minimal draft)
export interface JsonResumeLike {
  basics: { name: string; label?: string; email?: string; website?: string }
  skills?: { name: string; keywords: string[] }[]
  work?: { name: string; position?: string; summary?: string; highlights?: string[] }[]
  education?: { institution?: string; area?: string; studyType?: string; endDate?: string }[]
  certificates?: { name?: string; issuer?: string; date?: string }[]
}

export function toJsonResume(data: CanonicalExport): JsonResumeLike {
  return {
    basics: {
      name: data.person.name,
      label: data.person.title,
  email: (data.person as any).contact?.email, // eslint-disable-line @typescript-eslint/no-explicit-any
      website: data.person.contact.website,
    },
    skills: Object.values(
      data.skills.reduce<Record<string,string[]>>((acc, s) => {
        acc[s.category] ||= []
        acc[s.category].push(s.name)
        return acc
      }, {})
    ).map((keywords, i) => ({ name: 'Group ' + (i+1), keywords })),
    work: data.projects.map(p => ({ name: p.company || 'Project', position: p.role, summary: p.summary, highlights: p.highlights })),
    education: data.education?.map(e => ({ institution: e.institution, area: e.field, studyType: e.degree, endDate: e.period })),
    certificates: data.certifications?.map(c => ({ name: c.name, issuer: c.issuer, date: String(c.year) })),
  }
}
