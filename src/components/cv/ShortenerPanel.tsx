"use client"
import React, { useCallback, useMemo, useState } from 'react'
import type { CvSelection, CvData } from '@/lib/cv/schema'

interface ShortenerPanelProps {
  data: CvData
  selection: CvSelection
  onChange: (sel: CvSelection) => void
  onCopyPermalink: () => Promise<void>
  onOpenPrint: () => void
  onReset: () => void
}

export const ShortenerPanel: React.FC<ShortenerPanelProps> = ({
  data,
  selection,
  onChange,
  onCopyPermalink,
  onOpenPrint,
  onReset,
}) => {
  const [copied, setCopied] = useState(false)

  const toggleSkill = useCallback(
    (id: string) => {
      const current = new Set(selection.skills ?? data.skills.map((s) => s.id))
      if (current.has(id) && current.size > 1) current.delete(id)
      else current.add(id)
      onChange({ ...selection, skills: Array.from(current) })
    },
    [selection, onChange, data.skills],
  )

  const toggleProject = useCallback(
    (id: string) => {
      const current = new Set(selection.projects ?? data.projects.map((p) => p.id))
      if (current.has(id) && current.size > 1) current.delete(id)
      else current.add(id)
      onChange({ ...selection, projects: Array.from(current) })
    },
    [selection, onChange, data.projects],
  )

  const allSkillsSelected = (selection.skills ?? []).length === data.skills.length
  const allProjectsSelected = (selection.projects ?? []).length === data.projects.length

  const skillsSorted = useMemo(() => data.skills.slice().sort((a, b) => a.name.localeCompare(b.name)), [data.skills])
  const projectsSorted = useMemo(
    () => data.projects.slice().sort((a, b) => a.title.localeCompare(b.title)),
    [data.projects],
  )

  const selectAllSkills = () => onChange({ ...selection, skills: data.skills.map((s) => s.id) })
  const selectAllProjects = () => onChange({ ...selection, projects: data.projects.map((p) => p.id) })

  const handleCopy = async () => {
    await onCopyPermalink()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <aside data-testid="short-builder" className="no-print sticky top-4 h-max w-full max-w-xs rounded border border-slate-200 bg-white/80 p-4 text-sm shadow-sm backdrop-blur dark:border-slate-600 dark:bg-slate-800/70">
      <h2 className="mb-2 font-medium">Short CV Builder</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Wähle Skills & Projekte für eine gekürzte Fassung. Mindestens je 1 Eintrag bleibt erhalten.
      </p>
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">Skills</span>
            <button
              type="button"
              className="text-[11px] underline hover:text-sky-600"
              onClick={selectAllSkills}
            >
              Alle
            </button>
          </div>
          <ul className="max-h-40 overflow-auto rounded border border-slate-200 dark:border-slate-600">
            {skillsSorted.map((s) => {
              const checked = (selection.skills ?? data.skills.map((sk) => sk.id)).includes(s.id)
              return (
                <li key={s.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <input
                    aria-label={s.name}
                    type="checkbox"
                    className="h-3 w-3 accent-sky-600"
                    checked={checked}
                    onChange={() => toggleSkill(s.id)}
                  />
                  <span className="truncate text-xs">{s.name}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-1 text-[10px] text-slate-500">
            {selection.skills?.length ?? data.skills.length} / {data.skills.length} ausgewählt
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">Projects</span>
            <button
              type="button"
              className="text-[11px] underline hover:text-sky-600"
              onClick={selectAllProjects}
            >
              Alle
            </button>
          </div>
          <ul className="max-h-40 overflow-auto rounded border border-slate-200 dark:border-slate-600">
            {projectsSorted.map((p) => {
              const checked = (selection.projects ?? data.projects.map((pr) => pr.id)).includes(p.id)
              return (
                <li key={p.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <input
                    aria-label={p.title}
                    type="checkbox"
                    className="h-3 w-3 accent-sky-600"
                    checked={checked}
                    onChange={() => toggleProject(p.id)}
                  />
                  <span className="truncate text-xs">{p.title}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-1 text-[10px] text-slate-500">
            {selection.projects?.length ?? data.projects.length} / {data.projects.length} ausgewählt
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
            onClick={handleCopy}
          >
            {copied ? 'Kopiert!' : 'Permalink kopieren'}
          </button>
          <button
            type="button"
            className="rounded border border-sky-600 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:border-sky-400 dark:hover:bg-sky-800/40"
            onClick={onOpenPrint}
          >
            Drucken / PDF
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={onReset}
            disabled={allSkillsSelected && allProjectsSelected}
          >
            Reset
          </button>
        </div>
      </div>
    </aside>
  )
}

export default ShortenerPanel
