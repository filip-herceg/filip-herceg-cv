import React from 'react'
import type { CvRenderProps } from '@/lib/cv/types'
import { sampleCvDesign } from '@/lib/cv/sample-data'

// Minimal decorative SVG examples (placeholder). Replace / extend later.
const Stripe: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
    <defs>
      <pattern id="stripes" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="2" height="4" fill="currentColor" />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#stripes)" />
  </svg>
)

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
      <Stripe className="pointer-events-none absolute inset-0 text-sky-200 mix-blend-multiply opacity-5 print:opacity-10" />
      <div className="relative z-10 space-y-6 p-6 md:p-10">
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">{data.person.name}</h1>
          <p className="text-lg text-sky-700 dark:text-sky-300">{data.person.title}</p>
          <p className="mt-2 max-w-prose text-sm text-slate-600 dark:text-slate-300">
            {data.person.profile}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{data.person.contact.email}</span>
            {data.person.contact.location && <span>{data.person.contact.location}</span>}
            {data.person.contact.website && <span>{data.person.contact.website}</span>}
          </div>
        </header>
        <section>
          <h2 className="mb-2 text-xl font-semibold">Skills</h2>
          <ul className="flex flex-wrap gap-2 print:break-inside-avoid">
            {selectedSkills.map((s) => (
              <li
                key={s.id}
                className="rounded border border-slate-300 bg-white/70 px-2 py-1 text-xs shadow-sm backdrop-blur print:bg-white"
              >
                {s.name}
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Projects</h2>
          {selectedProjects.map((p) => (
            <article key={p.id} className="print:break-inside-avoid">
              <header>
                <h3 className="font-medium">{p.title}</h3>
                <p className="text-xs text-slate-500">
                  {p.role} – {p.period}
                </p>
              </header>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{p.summary}</p>
              {p.highlights.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs text-slate-600 dark:text-slate-400">
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
  )
}

export default CvView
