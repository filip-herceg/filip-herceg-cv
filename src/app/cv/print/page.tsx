import React from 'react'
import { CvDataSchema, CvSelectionSchema } from '@/lib/cv/schema'
import { getAggregate } from '@/lib/cv/service'
import CvView from '@/components/cv/CvView'
import '../../../../styles/print.css'

export const metadata = { title: 'CV Print' }

export default async function CvPrintPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { data, design } = await getAggregate('en')
  const validated = CvDataSchema.parse(data)
  const parsedSelection = CvSelectionSchema.safeParse({
    skills: typeof searchParams.skills === 'string' ? searchParams.skills : undefined,
    projects: typeof searchParams.projects === 'string' ? searchParams.projects : undefined,
    mode: typeof searchParams.mode === 'string' ? searchParams.mode : undefined,
  })
  const selection = parsedSelection.success ? parsedSelection.data : undefined
  return (
    <div className="print-page">
  <CvView data={validated} design={design} selection={selection} />
    </div>
  )
}
