import { describe, it, expect } from 'vitest'
import type { SkillRepo, SkillRecord, SkillInput } from '@/lib/admin/skill-handler'
import { upsertSkill, deleteSkill } from '@/lib/admin/skill-handler'

function createInMemoryRepo() {
  const items = new Map<string, SkillRecord>()
  const repo: SkillRepo = {
    async findUnique({ where }) {
      const key = where.id_locale.id + '::' + where.id_locale.locale
      return items.get(key) ?? null
    },
    async upsert({ where, update, create }) {
      const key = where.id_locale.id + '::' + where.id_locale.locale
      const existing = items.get(key)
      const next: SkillRecord = existing ? { ...existing, ...update } as SkillRecord : { ...create }
      items.set(key, next)
      return next
    },
    async delete({ where }) {
      const key = where.id_locale.id + '::' + where.id_locale.locale
      const existing = items.get(key)
      if (!existing) throw new Error('not found')
      items.delete(key)
      return existing
    },
  }
  return { repo, items }
}

function prismaFromRepo(repo: SkillRepo) { return { skill: repo } as any }

const base: Omit<SkillInput, 'id' | 'locale'> = { name: 'React', category: 'Library', level: 'advanced', years: 5, tags: ['ui'] }

describe('skill-handler', () => {
  it('creates then updates a skill', async () => {
    const { repo } = createInMemoryRepo()
    const prisma = prismaFromRepo(repo)
    const createRes = await upsertSkill(prisma, { id: 's1', locale: 'en', ...base })
    expect(createRes.action).toBe('create')
    const updateRes = await upsertSkill(prisma, { id: 's1', locale: 'en', ...base, name: 'ReactJS', years: 6, tags: ['ui','hooks'] })
    expect(updateRes.action).toBe('update')
  })

  it('deletes existing skill', async () => {
    const { repo } = createInMemoryRepo(); const prisma = prismaFromRepo(repo)
    await upsertSkill(prisma, { id: 's1', locale: 'en', name: 'TS', category: 'Lang' })
    const del = await deleteSkill(prisma, 's1', 'en')
    expect(del).toBe('deleted')
  })

  it('delete propagates error for missing skill', async () => {
    const { repo } = createInMemoryRepo(); const prisma = prismaFromRepo(repo)
    await expect(deleteSkill(prisma, 'missing', 'en')).rejects.toThrow('not found')
  })
})
