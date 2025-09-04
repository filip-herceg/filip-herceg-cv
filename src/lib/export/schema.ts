import { z } from 'zod'

export const SectionKeyEnum = z.enum(['PROFILE','SKILLS','PROJECTS','EXPERIENCE','EDUCATION','CERTIFICATIONS','TRAITS','HOBBIES','CONTACT'])

export const ExportSectionSchema = z.object({
  key: SectionKeyEnum,
  limit: z.number().int().positive().max(100).optional(),
  tags: z.array(z.string().min(1)).max(8).optional(),
})

export const ExportFiltersSchema = z.object({
  projectSinceYear: z.number().int().min(1970).max(new Date().getFullYear()).optional(),
  experienceSinceYear: z.number().int().min(1970).max(new Date().getFullYear()).optional(),
}).strict()

export const ExportConfigInputSchema = z.object({
  name: z.string().min(1).max(60),
  presetType: z.enum(['COMPREHENSIVE','CONCISE','LEADERSHIP','TECHNICAL']).optional(),
  sections: z.array(ExportSectionSchema).min(1).max(32)
    .refine((arr) => new Set(arr.map(s => s.key)).size === arr.length, { message: 'DUPLICATE_SECTION' }),
  filters: ExportFiltersSchema.optional(),
  density: z.enum(['normal','compact']).default('normal'),
  colorMode: z.enum(['auto','monochrome']).default('auto'),
  paperSize: z.enum(['A4','Letter']).default('A4'),
}).strict()

export type ExportConfigInput = z.infer<typeof ExportConfigInputSchema>
export type SectionKey = z.infer<typeof SectionKeyEnum>
