import ExportConfigsClient from './ui'
import { FEATURE_EXPORT_ENABLED } from '@/lib/constants'
import { ExportConfigRepository, type ExportConfigRecord } from '@/lib/export/service'
import { getPrisma } from '@/lib/cv/service'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (!FEATURE_EXPORT_ENABLED) return <p className="p-6 text-sm">Export feature disabled.</p>
  const prisma = getPrisma()
  const repo = new ExportConfigRepository(prisma)
  const configs: ExportConfigRecord[] = await repo.list()
  await prisma.$disconnect().catch(()=>{})
  return <ExportConfigsClient initial={configs.map(c => ({
    id: c.id,
    name: c.name,
    presetType: c.presetType || undefined,
    sections: c.json.sections,
    filters: c.json.filters,
    density: c.json.density,
    colorMode: c.json.colorMode,
    paperSize: c.json.paperSize,
    version: c.version,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString()
  }))} />
}
