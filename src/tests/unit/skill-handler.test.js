import { describe, it, expect } from 'vitest'
import { upsertSkill, deleteSkill } from '@/lib/admin/skill-handler'

function createInMemoryRepo() {
  const items = {}
  const repo = {
    async findUnique({ where }) {
      const key = where.id_locale.id + '::' + where.id_locale.locale
      return items[key] || null
    },
    async upsert({ where, update, create }) {
      const key = where.id_locale.id + '::' + where.id_locale.locale
      const exists = !!items[key]
      items[key] = exists ? { ...items[key], ...update } : { ...create }
      return items[key]
    },
    async delete({ where }) {
      const key = where.id_locale.id + '::' + where.id_locale.locale
      const existing = items[key]
      if (!existing) throw new Error('not found')
      delete items[key]
      return existing
    },
  }
  return { repo, items }
}

function prismaFromRepo(repo) { return { skill: repo } }

describe('skill-handler (JS mock)', () => {
  it('creates then updates a skill', async () => {
    const { repo } = createInMemoryRepo()
    const prisma = prismaFromRepo(repo)
    const createRes = await upsertSkill(prisma, { id: 's1', locale: 'en', name: 'React', category: 'Library', level: 'advanced', years: 5, tags: ['ui'] })
    expect(createRes.action).toBe('create')
    const updateRes = await upsertSkill(prisma, { id: 's1', locale: 'en', name: 'ReactJS', category: 'Library', level: 'advanced', years: 6, tags: ['ui','hooks'] })
    expect(updateRes.action).toBe('update')
  })

  it('deletes existing skill', async () => {
    const { repo } = createInMemoryRepo()
    const prisma = prismaFromRepo(repo)
    await upsertSkill(prisma, { id: 's1', locale: 'en', name: 'TS', category: 'Lang' })
    const del = await deleteSkill(prisma, 's1', 'en')
    expect(del).toBe('deleted')
  })

  it('delete propagates error for missing skill', async () => {
    const { repo } = createInMemoryRepo(); const prisma = prismaFromRepo(repo)
    await expect(deleteSkill(prisma, 'missing', 'en')).rejects.toThrow('not found')
  })
})
