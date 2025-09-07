import React from 'react'
import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { getCvData, getCvDesign } from '@/lib/cv/loader'
import CvView from '@/components/cv/CvView'
import '../../../../styles/print.css'

export const metadata = { title: 'CV Print' }

type SearchParamsRecord = Record<string, string | string[] | undefined>
export default async function CvPrintPage(props: Readonly<{ searchParams?: Promise<SearchParamsRecord> }>) {
  const [data, design] = await Promise.all([getCvData('en'), getCvDesign('en')])
  const validated = CvDataSchema.parse(data)
  const sp: SearchParamsRecord = props?.searchParams ? await props.searchParams : {}
  const parsedSelection = CvSelectionSchema.safeParse({
    skills: typeof sp.skills === 'string' ? sp.skills : undefined,
    projects: typeof sp.projects === 'string' ? sp.projects : undefined,
    mode: typeof sp.mode === 'string' ? sp.mode : undefined,
  })
  const selection = parsedSelection.success ? parsedSelection.data : undefined
  return (
    <div className="print-page">
  <CvView data={validated} design={design} selection={selection} />
    </div>
  )
}
