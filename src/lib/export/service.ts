import type { PrismaClient } from '@prisma/client'
import { ExportConfigInput } from './schema'
import crypto from 'crypto'

export interface ExportConfigRecord {
  id: string
  name: string
  presetType?: string | null
  json: ExportConfigInput
  version: number
  createdAt: Date
  updatedAt: Date
}

export function hashConfig(c: ExportConfigInput): string {
  return crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex').slice(0, 16)
}

export class ExportConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Provide minimal delegate typing (subset) to avoid any usage.
  private get delegate() {
    type Row = { id: string; name: string; presetType: string | null; json: unknown; version: number; createdAt: Date; updatedAt: Date }
    type Delegate = {
      findMany(args: { orderBy: { createdAt: 'desc' } }): Promise<Row[]>
      findUnique(args: { where: { id: string } }): Promise<Row | null>
      create(args: { data: { name: string; presetType?: string | null; json: object } }): Promise<Row>
      update(args: { where: { id: string }; data: { name: string; presetType?: string | null; json: object; version: { increment: number } } }): Promise<Row>
      delete(args: { where: { id: string } }): Promise<unknown>
    }
    return (this.prisma as unknown as { exportConfig: Delegate }).exportConfig
  }

  private map(row: { id: string; name: string; presetType: string | null; json: unknown; version: number; createdAt: Date; updatedAt: Date }): ExportConfigRecord {
    return { id: row.id, name: row.name, presetType: row.presetType, json: row.json as ExportConfigInput, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt }
  }

  async list(): Promise<ExportConfigRecord[]> {
  const rows = await this.delegate.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(r => this.map(r))
  }
  async get(id: string): Promise<ExportConfigRecord | null> {
  const r = await this.delegate.findUnique({ where: { id } })
    return r ? this.map(r) : null
  }
  async create(input: ExportConfigInput): Promise<ExportConfigRecord> {
  const row = await this.delegate.create({ data: { name: input.name, presetType: input.presetType, json: input as unknown as object } })
    return this.map(row)
  }
  async update(id: string, version: number, input: ExportConfigInput): Promise<ExportConfigRecord | 'VERSION_CONFLICT' | 'NOT_FOUND'> {
  const existing = await this.delegate.findUnique({ where: { id } })
    if (!existing) return 'NOT_FOUND'
    if (existing.version !== version) return 'VERSION_CONFLICT'
  const row = await this.delegate.update({ where: { id }, data: { name: input.name, presetType: input.presetType, json: input as unknown as object, version: { increment: 1 } } })
    return this.map(row)
  }
  async remove(id: string): Promise<boolean> {
    try { await this.delegate.delete({ where: { id } }); return true } catch { return false }
  }
}
