import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { decodePreset } from '@/lib/cv/permalink'
import { getAggregate } from '@/lib/cv/service'
import CvView from '@/components/cv/CvView'
import dynamic from 'next/dynamic'

// Client-only builder (no SSR) to keep full page lean
const ShortModeContainer = dynamic(() => import('@/components/cv/ShortModeContainer'), { ssr: false })

// Full CV page with optional short builder mode
export default async function CvPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { data, design } = await getAggregate('en')
  const validated = CvDataSchema.parse(data)
  // Build URLSearchParams from searchParams record
  const usp = new URLSearchParams()
  for (const [k,v] of Object.entries(searchParams)) {
    if (typeof v === 'string') usp.set(k, v)
  }
  let selection: { mode?: 'short'; skills?: string[]; projects?: string[] } | undefined
  // Try token first
  const token = usp.get('cv')
  if (token) {
    const decoded = await decodePreset(token)
    if (decoded.ok) selection = decoded.preset
  }
  if (!selection) {
    // Fallback to expanded query parse
    const parsedSelection = CvSelectionSchema.safeParse({
      skills: typeof searchParams.skills === 'string' ? searchParams.skills : undefined,
      projects: typeof searchParams.projects === 'string' ? searchParams.projects : undefined,
      mode: typeof searchParams.mode === 'string' ? searchParams.mode : undefined,
    })
    selection = parsedSelection.success ? parsedSelection.data : undefined
  }
  const isShort = selection?.mode === 'short'
  return isShort ? (
    <main className="mx-auto w-full p-4 md:p-6">
      <ShortModeContainer data={validated} design={design} initialSelection={selection} />
    </main>
  ) : (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <CvView data={validated} design={design} selection={selection} />
    </main>
  )
}
