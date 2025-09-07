import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { decodePreset } from '@/lib/cv/permalink'
import { getCvData, getCvDesign } from '@/lib/cv/loader'
import CvView from '@/components/cv/CvView'
import ShortModeContainer from '@/components/cv/ShortModeContainer'
import { localizedMeta, localeFromHeaders } from '@/lib/i18n'

type SearchParamsRecord = Record<string, string | string[] | undefined>

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const locale = localeFromHeaders()
  return localizedMeta(locale, 'cv', { path: 'cv' })
}

// Client-only builder (no SSR) to keep full page lean
// Helper function to build URLSearchParams from searchParams record
function buildURLSearchParams(searchParams: SearchParamsRecord): URLSearchParams {
  const usp = new URLSearchParams()
  for (const [k,v] of Object.entries(searchParams)) {
    if (typeof v === 'string') usp.set(k, v)
  }
  return usp
}
// Helper function to parse selection from search parameters
async function parseSelection(searchParams: SearchParamsRecord): Promise<{ mode?: 'short'; skills?: string[]; projects?: string[] } | undefined> {
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
// Align with Next typegen: searchParams may be a Promise
export default async function CvPage(props: { searchParams?: Promise<SearchParamsRecord> }) {
  const [data, design] = await Promise.all([getCvData('en'), getCvDesign('en')])
  const validated = CvDataSchema.parse(data)
  const spResolved: SearchParamsRecord = props.searchParams ? await props.searchParams : {}
  const selection = await parseSelection(spResolved)
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
  
