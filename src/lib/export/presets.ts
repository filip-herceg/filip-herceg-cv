import { ExportConfigInput } from './schema'

const currentYear = new Date().getFullYear()

export function buildComprehensivePreset(): ExportConfigInput {
  return {
    name: 'Comprehensive',
    presetType: 'COMPREHENSIVE',
    sections: [
      { key: 'PROFILE' },
      { key: 'SKILLS' },
      { key: 'PROJECTS' },
      { key: 'EXPERIENCE' },
      { key: 'EDUCATION' },
      { key: 'CERTIFICATIONS' },
      { key: 'TRAITS' },
      { key: 'HOBBIES' },
      { key: 'CONTACT' },
    ],
    density: 'normal',
    colorMode: 'auto',
    paperSize: 'A4',
  }
}

export function buildConcisePreset(): ExportConfigInput {
  return {
    name: 'Concise',
    presetType: 'CONCISE',
    sections: [
      { key: 'PROFILE' },
      { key: 'SKILLS', limit: 12 },
      { key: 'PROJECTS', limit: 5 },
      { key: 'EXPERIENCE', limit: 5 },
    ],
    filters: { projectSinceYear: currentYear - 5, experienceSinceYear: currentYear - 7 },
    density: 'compact',
    colorMode: 'auto',
    paperSize: 'A4',
  }
}

export function buildLeadershipPreset(): ExportConfigInput {
  return {
    name: 'Leadership',
    presetType: 'LEADERSHIP',
    sections: [
      { key: 'PROFILE' },
      { key: 'SKILLS', limit: 10, tags: ['leadership', 'communication'] },
      { key: 'EXPERIENCE', limit: 7, tags: ['leadership', 'management'] },
      { key: 'PROJECTS', limit: 4, tags: ['leadership'] },
      { key: 'CONTACT' },
    ],
    filters: { experienceSinceYear: currentYear - 10 },
    density: 'normal',
    colorMode: 'auto',
    paperSize: 'A4',
  }
}

export function buildTechnicalPreset(): ExportConfigInput {
  return {
    name: 'Technical',
    presetType: 'TECHNICAL',
    sections: [
      { key: 'PROFILE' },
      { key: 'SKILLS', limit: 16, tags: ['typescript', 'node', 'react'] },
      { key: 'PROJECTS', limit: 6, tags: ['typescript', 'node', 'react'] },
      { key: 'EXPERIENCE', limit: 6, tags: ['engineering', 'backend', 'frontend'] },
      { key: 'CONTACT' },
    ],
    filters: { projectSinceYear: currentYear - 3, experienceSinceYear: currentYear - 8 },
    density: 'compact',
    colorMode: 'auto',
    paperSize: 'A4',
  }
}

export const PRESET_BUILDERS = {
  COMPREHENSIVE: buildComprehensivePreset,
  CONCISE: buildConcisePreset,
  LEADERSHIP: buildLeadershipPreset,
  TECHNICAL: buildTechnicalPreset,
} as const
