import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { sampleCvData, sampleCvDesign } from '@/lib/cv/sample-data'
import CvView from '@/components/cv/CvView'

// Full CV page; short mode handled client-side (to be extended in later step)
export default function CvPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const data = CvDataSchema.parse(sampleCvData)
  // Basic selection parse (ids potentially provided even in full view) – ignore invalid
  const parsedSelection = CvSelectionSchema.safeParse({
    skills: typeof searchParams.skills === 'string' ? searchParams.skills : undefined,
    projects: typeof searchParams.projects === 'string' ? searchParams.projects : undefined,
    mode: typeof searchParams.mode === 'string' ? searchParams.mode : undefined,
  })
  const selection = parsedSelection.success ? parsedSelection.data : undefined
  return (
    <main className="mx-auto max-w-4xl">
      <CvView data={data} design={sampleCvDesign} selection={selection} />
    </main>
  )
}
