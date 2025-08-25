import React from 'react'
import type { CvRenderProps } from '@/lib/cv/types'
import { sampleCvDesign } from '@/lib/cv/sample-data'
import Stripe from './shapes/Stripe'
import Grid from './shapes/Grid'
import Wave from './shapes/Wave'
import Blob from './shapes/Blob'

const shapeComponentMap = {
  stripe: Stripe,
  grid: Grid,
  wave: Wave,
  blob: Blob,
}

export const CvView: React.FC<CvRenderProps> = ({ data, design = sampleCvDesign, selection, className }) => {
  const selectedSkills = selection?.skills?.length
    ? data.skills.filter((s) => selection.skills!.includes(s.id))
    : data.skills
  const selectedProjects = selection?.projects?.length
    ? data.projects.filter((p) => selection.projects!.includes(p.id))
    : data.projects

  return (
    <div
      className={`relative print:bg-white ${className ?? ''}`}
      style={{ color: design.palette.text, background: design.palette.background }}
    >
      {/* Decorative shapes */}
      {design.shapes.map((shape, idx) => {
        const Comp = shapeComponentMap[shape.kind]
        const base = 'pointer-events-none absolute inset-0'
        const posClass =
          shape.position && shape.position !== 'full'
            ? `inset-auto ${
                shape.position.includes('top') ? 'top-0' : 'bottom-0'
              } ${shape.position.includes('left') ? 'left-0' : 'right-0'} w-1/2 h-1/2`
            : 'inset-0'
        return (
          <Comp
            key={idx}
            className={`${base} ${posClass}`}
            accent={shape.accent ?? design.palette.accent}
            opacity={shape.opacity ?? 0.08}
            seed={shape.seed}
          />
        )
      })}
      <div className="relative z-10 p-6 md:p-10">
        <header className="border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{data.person.name}</h1>
          <p className="text-lg text-sky-700 dark:text-sky-300">{data.person.title}</p>
          <p className="mt-2 max-w-prose text-sm text-slate-600 dark:text-slate-300">{data.person.profile}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{data.person.contact.email}</span>
            {data.person.contact.location && <span>{data.person.contact.location}</span>}
            {data.person.contact.website && <span>{data.person.contact.website}</span>}
          </div>
        </header>
        <div
          className="cv-columns gap-8"
          data-test="cv-columns"
          style={{ columnCount: design.page.columns, columnGap: design.page.gutter }}
        >
          <section className="mb-6 break-avoid inline-block w-full align-top">
            <h2 className="mb-2 text-xl font-semibold">Skills</h2>
            <ul className="flex flex-wrap gap-2">
              {selectedSkills.map((s) => (
                <li
                  key={s.id}
                  className="rounded border border-slate-300 bg-white/70 px-2 py-1 text-xs shadow-sm backdrop-blur print:bg-white dark:border-slate-600 dark:bg-slate-700/40"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-4 break-avoid inline-block w-full align-top" data-test="cv-projects">
            <h2 className="text-xl font-semibold">Projects</h2>
            {selectedProjects.map((p) => (
              <article key={p.id} className="break-avoid">
                <header>
                  <h3 className="font-medium text-sm">{p.title}</h3>
                  <p className="text-[11px] text-slate-500">
                    {p.role} – {p.period}
                  </p>
                </header>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {p.summary}
                </p>
                {p.highlights.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    {p.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

export default CvView
