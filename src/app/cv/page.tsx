import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { sampleCvData, sampleCvDesign } from '@/lib/cv/sample-data'
import CvView from '@/components/cv/CvView'
import dynamic from 'next/dynamic'

// Enable SSR (default) so short mode panel is present in initial HTML for E2E reliability
const ShortModeContainer = dynamic(() => import('@/components/cv/ShortModeContainer'))

// Full CV page with optional short builder mode
export default function CvPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const data = CvDataSchema.parse(sampleCvData)
  // Basic selection parse (ids potentially provided even in full view) – ignore invalid
  const parsedSelection = CvSelectionSchema.safeParse({
    skills: typeof searchParams.skills === 'string' ? searchParams.skills : undefined,
    projects: typeof searchParams.projects === 'string' ? searchParams.projects : undefined,
    mode: typeof searchParams.mode === 'string' ? searchParams.mode : undefined,
  })
  const selection = parsedSelection.success ? parsedSelection.data : undefined
  const isShort = selection?.mode === 'short'
  return isShort ? (
    <main className="mx-auto w-full p-4 md:p-6">
      <ShortModeContainer data={data} design={sampleCvDesign} initialSelection={selection} />
    </main>
  ) : (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <CvView data={data} design={sampleCvDesign} selection={selection} />
    </main>
  )
}
