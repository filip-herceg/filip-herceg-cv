import { z } from 'zod'
import type { SkillCategory } from './types'

export const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.custom<SkillCategory>((val) =>
    ['Language', 'Framework', 'Tool', 'Concept'].includes(String(val)),
  ),
  level: z.string().optional(),
  years: z.number().min(0).max(60).optional(),
  tags: z.array(z.string().min(1)).optional(),
})

export const ProjectLinkSchema = z.object({ label: z.string(), url: z.string().url() })

export const ProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  role: z.string().min(1),
  period: z.string().min(1),
  company: z.string().optional(),
  summary: z.string().min(1),
  highlights: z.array(z.string().min(1)).default([]),
  stack: z.array(z.string().min(1)).default([]),
  impact: z.string().optional(),
  links: z.array(ProjectLinkSchema).optional(),
})

export const PersonContactSchema = z.object({
  email: z.string().email(),
  location: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  github: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
})

export const PersonInfoSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  profile: z.string().min(1),
  contact: PersonContactSchema,
  links: z.array(ProjectLinkSchema).optional(),
})

export const CvDataSchema = z.object({
  person: PersonInfoSchema,
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema),
})

export const CvPageDesignSchema = z.object({
  size: z.literal('A4'),
  margin: z.string().min(1),
  columns: z.number().int().min(1).max(3),
  gutter: z.string().min(1),
})

export const CvPaletteDesignSchema = z.object({
  mode: z.enum(['light', 'dark']),
  primary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  mutedText: z.string(),
})

export const CvTypographyDesignSchema = z.object({
  body: z.string(),
  heading: z.string(),
  monospace: z.string().optional(),
  scale: z.number().min(0.5).max(2).optional(),
})

export const CvShapeSpecSchema = z.object({
  kind: z.enum(['stripe', 'grid', 'wave', 'blob']),
  seed: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  accent: z.string().optional(),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'full']).optional(),
})

export const CvSectionSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int(),
  enabled: z.boolean(),
})

export const CvDesignSchema = z.object({
  page: CvPageDesignSchema,
  palette: CvPaletteDesignSchema,
  typography: CvTypographyDesignSchema,
  shapes: z.array(CvShapeSpecSchema),
  sections: z.array(CvSectionSpecSchema),
})

export const CvSelectionSchema = z.object({
  skills: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : undefined)),
  projects: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : undefined)),
  mode: z.enum(['short']).optional(),
})

export type CvData = z.infer<typeof CvDataSchema>
export type CvDesign = z.infer<typeof CvDesignSchema>
