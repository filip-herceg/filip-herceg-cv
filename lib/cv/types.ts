// Core CV domain types
// These interfaces are deliberately exhaustive but optional fields are marked to allow
// progressive enhancement. Keep in sync with Zod schemas in `schema.ts`.

export type SkillCategory = 'Language' | 'Framework' | 'Tool' | 'Concept'

export interface Skill {
  id: string
  name: string
  category: SkillCategory
  level?: string // e.g. 'Advanced', 'Intermediate', numeric scales avoided for semantics
  years?: number
  tags?: string[]
}

export interface ProjectLink {
  label: string
  url: string
}

export interface Project {
  id: string
  title: string
  role: string
  period: string // e.g. '2022 – 2024'
  company?: string
  summary: string
  highlights: string[]
  stack: string[]
  impact?: string
  links?: ProjectLink[]
}

export interface PersonContact {
  email: string
  location?: string
  phone?: string
  website?: string
  github?: string
  linkedin?: string
  twitter?: string
}

export interface PersonInfo {
  name: string
  title: string
  profile: string
  contact: PersonContact
  links?: ProjectLink[]
}

export interface CvData {
  person: PersonInfo
  skills: Skill[]
  projects: Project[]
}

// Design / layout meta (can expand later with themes)
export interface CvPageDesign {
  size: 'A4'
  margin: string // CSS dimension, e.g. '16mm'
  columns: number
  gutter: string // CSS dimension
}

export interface CvPaletteDesign {
  mode: 'light' | 'dark'
  primary: string
  accent: string
  background: string
  surface: string
  text: string
  mutedText: string
}

export interface CvTypographyDesign {
  body: string
  heading: string
  monospace?: string
  scale?: number // base multiplier
}

export interface CvShapeSpec {
  kind: 'stripe' | 'grid' | 'wave' | 'blob'
  seed?: number
  opacity?: number
  accent?: string
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'full'
}

export interface CvSectionSpec {
  id: string
  label: string
  order: number
  enabled: boolean
}

export interface CvDesign {
  page: CvPageDesign
  palette: CvPaletteDesign
  typography: CvTypographyDesign
  shapes: CvShapeSpec[]
  sections: CvSectionSpec[]
}

export interface CvSelection {
  skills?: string[]
  projects?: string[]
}

export interface CvRenderProps {
  data: CvData
  design: CvDesign
  selection?: CvSelection
  className?: string
}
