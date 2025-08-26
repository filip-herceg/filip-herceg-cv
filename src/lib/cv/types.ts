// Core CV domain types (extended)
export type SkillCategory = 'Language' | 'Framework' | 'Tool' | 'Concept' | 'Platform' | 'Service' | 'Library'
export interface Skill { id: string; name: string; category: SkillCategory; level?: string; years?: number; tags?: string[] }
export interface ProjectLink { label: string; url: string }
export interface Project {
  id: string; title: string; role: string; period: string; company?: string; summary: string; highlights: string[]; stack: string[]; impact?: string; links?: ProjectLink[]
}
export interface ExperienceAchievement { summary: string; impact?: string; metrics?: string[] }
export interface Experience {
  id: string; company: string; role: string; period: string; location?: string; employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship';
  summary?: string; achievements: ExperienceAchievement[]; stack?: string[]; tags?: string[]
}
export interface Education {
  id: string; institution: string; degree: string; field?: string; period: string; location?: string; grade?: string; summary?: string; highlights?: string[]
}
export interface Certification { id: string; name: string; issuer: string; year?: number; url?: string }
export interface Trait { id: string; name: string; description?: string; category?: string }
export interface Hobby { id: string; name: string; description?: string }
export interface PersonContact { email: string; location?: string; phone?: string; website?: string; github?: string; linkedin?: string; twitter?: string }
export interface PersonInfo { name: string; title: string; profile: string; contact: PersonContact; links?: ProjectLink[] }
export interface CvData {
  person: PersonInfo; skills: Skill[]; projects: Project[]; experiences?: Experience[]; education?: Education[]; certifications?: Certification[]; traits?: Trait[]; hobbies?: Hobby[]
}
export interface CvPageDesign { size: 'A4'; margin: string; columns: number; gutter: string }
export interface CvPaletteDesign { mode: 'light' | 'dark'; primary: string; accent: string; background: string; surface: string; text: string; mutedText: string }
export interface CvTypographyDesign { body: string; heading: string; monospace?: string; scale?: number }
export interface CvShapeSpec { kind: 'stripe' | 'grid' | 'wave' | 'blob'; seed?: number; opacity?: number; accent?: string; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'full' }
export interface CvSectionSpec { id: string; label: string; order: number; enabled: boolean }
export interface CvDesign { page: CvPageDesign; palette: CvPaletteDesign; typography: CvTypographyDesign; shapes: CvShapeSpec[]; sections: CvSectionSpec[] }
export interface CvSelection { skills?: string[]; projects?: string[]; experiences?: string[]; education?: string[] }
export interface CvRenderProps { data: CvData; design: CvDesign; selection?: CvSelection; className?: string }
