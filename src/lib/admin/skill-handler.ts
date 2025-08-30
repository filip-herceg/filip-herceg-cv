import type { PrismaClient } from '@prisma/client'

export interface SkillInput {
  id: string
  locale: string
  name: string
  category: string
  level?: string | null
  years?: number | null
  tags?: string[] | null
}

export type SkillRecord = {
  id: string
  locale: string
  name: string
  category: string
  level?: string | null
  years?: number | null
  tagsJson?: string | null
}

export interface SkillRepo {
  findUnique(args: { where: { id_locale: { id: string; locale: string } } }): Promise<SkillRecord | null>
  upsert(args: { where: { id_locale: { id: string; locale: string } }; update: Partial<SkillRecord>; create: SkillRecord }): Promise<SkillRecord>
  delete(args: { where: { id_locale: { id: string; locale: string } } }): Promise<SkillRecord>
}

function repoFromPrisma(prisma: PrismaClient): SkillRepo {
  // The generated client exposes .skill with findUnique/upsert/delete; cast keeps isolation from generated types.
  return (prisma as unknown as { skill: SkillRepo }).skill
}

export interface UpsertResult { action: 'create' | 'update' }

export async function upsertSkill(prisma: PrismaClient, input: SkillInput): Promise<UpsertResult> {
  const repo = repoFromPrisma(prisma)
  const existing = await repo.findUnique({ where: { id_locale: { id: input.id, locale: input.locale } } })
  await repo.upsert({
    where: { id_locale: { id: input.id, locale: input.locale } },
    update: {
      name: input.name,
      category: input.category,
      level: input.level,
      years: input.years,
      tagsJson: input.tags ? JSON.stringify(input.tags) : null,
    },
    create: {
      id: input.id,
      locale: input.locale,
      name: input.name,
      category: input.category,
      level: input.level,
      years: input.years,
      tagsJson: input.tags ? JSON.stringify(input.tags) : null,
    },
  })
  return { action: existing ? 'update' : 'create' }
}

export async function deleteSkill(prisma: PrismaClient, id: string, locale: string): Promise<'deleted'> {
  const repo = repoFromPrisma(prisma)
  await repo.delete({ where: { id_locale: { id, locale } } }) // return value ignored
  return 'deleted'
}
