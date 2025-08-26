"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { buildPermalink, encodePreset } from '@/lib/cv/permalink'
import type { CvData, CvSelection } from '@/lib/cv/schema'
import type { CvDesign } from '@/lib/cv/schema'
import CvView from './CvView'
import ShortenerPanel from './ShortenerPanel'

interface Props {
  data: CvData
  design: CvDesign
  initialSelection?: CvSelection
}

const selectionToPreset = (sel: CvSelection) => ({
  mode: 'short' as const,
  skills: sel.skills,
  projects: sel.projects,
})

export const ShortModeContainer: React.FC<Props> = ({ data, design, initialSelection }) => {
  const router = useRouter()
  const pathname = usePathname()
  // const searchParams = useSearchParams() // not currently needed; selection state persisted via router.replace

  const fullSkills = useMemo(() => data.skills.map((s) => s.id), [data.skills])
  const fullProjects = useMemo(() => data.projects.map((p) => p.id), [data.projects])

  const [selection, setSelection] = useState<CvSelection>({
    skills: initialSelection?.skills ?? fullSkills,
    projects: initialSelection?.projects ?? fullProjects,
  })

  // Sync URL (debounced by RAF) when selection changes
  useEffect(() => {
    const handle = requestAnimationFrame(async () => {
      // Update URL using compact token form
      try {
        const token = await encodePreset(selectionToPreset(selection))
        router.replace(`${pathname}?cv=${token}`)
      } catch {
        // fallback: do nothing
      }
    })
    return () => cancelAnimationFrame(handle)
  }, [selection, router, pathname])

  const onChange = useCallback((sel: CvSelection) => setSelection(sel), [])

  const onCopyPermalink = useCallback(async () => {
    const url = await buildPermalink(`${window.location.origin}${pathname}`, selectionToPreset(selection))
    await navigator.clipboard.writeText(url)
  }, [selection, pathname])

  const onOpenPrint = useCallback(() => {
  const params = new URLSearchParams()
  if (selection.skills?.length) params.set('skills', selection.skills.join(','))
  if (selection.projects?.length) params.set('projects', selection.projects.join(','))
  const printUrl = `/cv/print?${params.toString()}`
    const w = window.open(printUrl, '_blank')
    if (w) {
      // Attempt auto-print after load
      const listener = () => {
        try { w.print() } catch {}
        w.removeEventListener('load', listener)
      }
      w.addEventListener('load', listener)
    }
  }, [selection])

  const onReset = useCallback(() => {
    setSelection({ skills: fullSkills, projects: fullProjects })
  }, [fullSkills, fullProjects])

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6">
      <ShortenerPanel
        data={data}
        selection={selection}
        onChange={onChange}
        onCopyPermalink={onCopyPermalink}
        onOpenPrint={onOpenPrint}
        onReset={onReset}
      />
      <div className="flex-1">
        <CvView data={data} design={design} selection={selection} />
      </div>
    </div>
  )
}

export default ShortModeContainer
