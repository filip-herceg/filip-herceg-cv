// Core CV domain types
export type SkillCategory = 'Language' | 'Framework' | 'Tool' | 'Concept'
export interface Skill { id: string; name: string; category: SkillCategory; level?: string; years?: number; tags?: string[] }
export interface ProjectLink { label: string; url: string }
export interface Project {
  id: string; title: string; role: string; period: string; company?: string; summary: string; highlights: string[]; stack: string[]; impact?: string; links?: ProjectLink[]
}
export interface PersonContact { email: string; location?: string; phone?: string; website?: string; github?: string; linkedin?: string; twitter?: string }
export interface PersonInfo { name: string; title: string; profile: string; contact: PersonContact; links?: ProjectLink[] }
export interface CvData { person: PersonInfo; skills: Skill[]; projects: Project[] }
export interface CvPageDesign { size: 'A4'; margin: string; columns: number; gutter: string }
export interface CvPaletteDesign { mode: 'light' | 'dark'; primary: string; accent: string; background: string; surface: string; text: string; mutedText: string }
export interface CvTypographyDesign { body: string; heading: string; monospace?: string; scale?: number }
export interface CvShapeSpec { kind: 'stripe' | 'grid' | 'wave' | 'blob'; seed?: number; opacity?: number; accent?: string; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'full' }
export interface CvSectionSpec { id: string; label: string; order: number; enabled: boolean }
export interface CvDesign { page: CvPageDesign; palette: CvPaletteDesign; typography: CvTypographyDesign; shapes: CvShapeSpec[]; sections: CvSectionSpec[] }
export interface CvSelection { skills?: string[]; projects?: string[] }
export interface CvRenderProps { data: CvData; design: CvDesign; selection?: CvSelection; className?: string }
