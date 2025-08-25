import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { sampleCvData, sampleCvDesign } from '@/lib/cv/sample-data'
import CvView from '@/components/cv/CvView'
import '../../../../styles/print.css'

export const metadata = { title: 'CV Print' }

export default function CvPrintPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const data = CvDataSchema.parse(sampleCvData)
  const parsedSelection = CvSelectionSchema.safeParse({
    skills: typeof searchParams.skills === 'string' ? searchParams.skills : undefined,
    projects: typeof searchParams.projects === 'string' ? searchParams.projects : undefined,
    mode: typeof searchParams.mode === 'string' ? searchParams.mode : undefined,
  })
  const selection = parsedSelection.success ? parsedSelection.data : undefined
  return (
    <div className="print-page">
      <CvView data={data} design={sampleCvDesign} selection={selection} />
    </div>
  )
}
