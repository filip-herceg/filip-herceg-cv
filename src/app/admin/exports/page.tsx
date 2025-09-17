import ExportConfigsClient from './ui'
import { headers } from 'next/headers'
import { FEATURE_EXPORT_ENABLED } from '@/lib/constants'
import { ExportConfigRepository, type ExportConfigRecord } from '@/lib/export/service'
import { getPrisma } from '@/lib/cv/service'

export const dynamic = 'force-dynamic'

export default async function Page() {
	if (!FEATURE_EXPORT_ENABLED) return <p className="p-6 text-sm">Export feature disabled.</p>
	const prisma = getPrisma()
	const repo = new ExportConfigRepository(prisma)
	const configs: ExportConfigRecord[] = await repo.list()
		// Using shared prisma; no explicit disconnect here
	// Attempt to read last_used cookie (best-effort; Next.js server components allow headers().get('cookie'))
	let lastUsedId: string | undefined
	try {
		const h = await headers()
		const cookieHeader = (h as unknown as Headers).get('cookie') ?? undefined
		if (cookieHeader) {
			const match = /last_export_config=([^;]+)/.exec(cookieHeader)
			if (match) lastUsedId = decodeURIComponent(match[1])
		}
	} catch { /* ignore */ }
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
	}))} lastUsedId={lastUsedId} />
}
