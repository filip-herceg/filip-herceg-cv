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

  // Print options via query params (with safe defaults)
  const paperParam = typeof sp.paper === 'string' ? sp.paper.toLowerCase() : 'a4' // 'a4' | 'letter'
  const paper = paperParam === 'letter' ? 'letter' : 'a4'
  const densityParam = typeof sp.density === 'string' ? sp.density.toLowerCase() : 'normal' // 'normal' | 'compact'
  const density = densityParam === 'compact' ? 'compact' : 'normal'

  // CSS variables for print tokens; compact makes text a bit tighter
  type PrintCssVars = React.CSSProperties & {
    ['--print-margin']?: string
    ['--print-font-size']?: string
    ['--print-line-height']?: string
  }
  const cssVars: PrintCssVars = {
    // margin for @page picked from CSS var in print.css
    ['--print-margin']: '16mm',
    ['--print-font-size']: density === 'compact' ? '10.5pt' : '11pt',
    ['--print-line-height']: density === 'compact' ? '1.28' : '1.35',
  }

  // Inline @page size override (A4 by default, Letter on demand)
  const inlinePageStyle = `@media print { @page { size: ${paper === 'letter' ? 'Letter' : 'A4'}; } }`
  return (
    <div className="print-page" data-paper={paper} data-density={density} style={cssVars}>
      {/* Inline style to set @page size based on query param */}
      <style dangerouslySetInnerHTML={{ __html: inlinePageStyle }} />
      <CvView data={validated} design={design} selection={selection} />
    </div>
  )
}
