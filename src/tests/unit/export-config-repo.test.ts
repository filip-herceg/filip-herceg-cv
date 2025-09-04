import { describe, it, expect } from 'vitest'
import { ExportConfigRepository } from '@/lib/export/service'
import { ExportConfigInput } from '@/lib/export/schema'
import crypto from 'crypto'

// In-memory stub for the Prisma exportConfig delegate to avoid real DB dependency.
type Row = { id: string; name: string; presetType: string | null; json: unknown; version: number; createdAt: Date; updatedAt: Date }
const rows: Row[] = []
const delegate = {
  async findMany(_args: { orderBy: { createdAt: 'desc' } }): Promise<Row[]> {
    return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },
  async findUnique(args: { where: { id: string } }): Promise<Row | null> {
    return rows.find(r => r.id === args.where.id) ?? null
  },
  async create(args: { data: { name: string; presetType?: string | null; json: object } }): Promise<Row> {
    const now = new Date()
    const row: Row = {
      id: crypto.randomUUID(),
      name: args.data.name,
      presetType: args.data.presetType ?? null,
      json: args.data.json,
      version: 1,
      createdAt: now,
      updatedAt: now
    }
    rows.push(row)
    return row
  },
  async update(args: { where: { id: string }; data: { name: string; presetType?: string | null; json: object; version: { increment: number } } }): Promise<Row> {
    const idx = rows.findIndex(r => r.id === args.where.id)
    if (idx === -1) throw new Error('NOT_FOUND')
    const existing = rows[idx]
    const updated: Row = {
      ...existing,
      name: args.data.name,
      presetType: args.data.presetType ?? null,
      json: args.data.json,
      version: existing.version + args.data.version.increment,
      updatedAt: new Date()
    }
    rows[idx] = updated
    return updated
  },
  async delete(args: { where: { id: string } }): Promise<unknown> {
    const idx = rows.findIndex(r => r.id === args.where.id)
    if (idx !== -1) rows.splice(idx, 1)
    return {}
  }
}

// Stub prisma object exposing only the required delegate shape.
const prismaStub = { exportConfig: delegate } as const
const repo = new ExportConfigRepository(prismaStub as any)

describe('ExportConfigRepository basic flow (stub)', () => {
  let createdId: string
  const base: ExportConfigInput = {
    name: 'Test Config',
    sections: [{ key: 'PROFILE' }, { key: 'SKILLS', limit: 10 }],
    density: 'normal',
    colorMode: 'auto',
    paperSize: 'A4'
  } as const

  it('creates config', async () => {
    const row = await repo.create(base)
    createdId = row.id
    expect(row.json.name).toBe(base.name)
  })

  it('lists configs', async () => {
    const rows = await repo.list()
    expect(rows.find(r => r.id === createdId)).toBeTruthy()
  })
})
