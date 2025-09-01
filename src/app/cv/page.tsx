import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { decodePreset } from '@/lib/cv/permalink'
import { getAggregate } from '@/lib/cv/service'
import CvView from '@/components/cv/CvView'
import ShortModeContainer from '@/components/cv/ShortModeContainer'
import { localizedMeta, localeFromHeaders } from '@/lib/i18n'

type SearchParams = Record<string, string | string[] | undefined>

export const dynamic = 'error'
export async function generateMetadata() {
  const locale = localeFromHeaders()
  return localizedMeta(locale, 'cv', { path: 'cv' })
}

// Client-only builder (no SSR) to keep full page lean
// Helper function to build URLSearchParams from searchParams record
function buildURLSearchParams(searchParams: Record<string, string | string[] | undefined>): URLSearchParams {
  const usp = new URLSearchParams()
  for (const [k,v] of Object.entries(searchParams)) {
    if (typeof v === 'string') usp.set(k, v)
  }
  return usp
}
// Helper function to parse selection from search parameters
async function parseSelection(searchParams: Record<string, string | string[] | undefined>): Promise<{ mode?: 'short'; skills?: string[]; projects?: string[] } | undefined> {
  const usp = buildURLSearchParams(searchParams)
  
  // Try token first
  const token = usp.get('cv')
  if (token) {
    const decoded = await decodePreset(token)
    if (decoded.ok) return decoded.preset
  }
  
  // Fallback to expanded query parse
  const parsedSelection = CvSelectionSchema.safeParse({
    skills: typeof searchParams.skills === 'string' ? searchParams.skills : undefined,
    projects: typeof searchParams.projects === 'string' ? searchParams.projects : undefined,
    mode: typeof searchParams.mode === 'string' ? searchParams.mode : undefined,
  })
  return parsedSelection.success ? parsedSelection.data : undefined
}
// Full CV page with optional short builder mode
export default async function CvPage({ searchParams }: { searchParams: SearchParams }) {
  const { data, design } = await getAggregate('en')
  const validated = CvDataSchema.parse(data)
  const selection = await parseSelection(searchParams)
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
