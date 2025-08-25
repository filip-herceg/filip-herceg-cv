import React from 'react'
import type { CvData, CvSelection } from '@/lib/cv/schema'

interface ShortenerPanelProps {
  data: CvData
  selection: CvSelection
  onChange: (sel: CvSelection) => void
}

// Minimal placeholder – real implementation (step 7) will add interactive controls & permalink.
export const ShortenerPanel: React.FC<ShortenerPanelProps> = ({ data, selection, onChange }) => {
  return (
    <aside className="no-print sticky top-4 h-max w-full max-w-xs rounded border border-slate-200 bg-white/70 p-4 text-sm shadow-sm backdrop-blur">
      <h2 className="mb-2 font-medium">Short CV Builder</h2>
      <p className="mb-3 text-xs text-slate-500">
        This is a placeholder panel. Upcoming steps will allow selecting specific skills & projects and
        generating a sharable permalink + PDF.
      </p>
      <div className="space-y-2">
        <div>
          <span className="font-semibold">Skills:</span> {selection.skills?.length ?? data.skills.length} /
          {data.skills.length}
        </div>
        <div>
          <span className="font-semibold">Projects:</span> {selection.projects?.length ?? data.projects.length} /
          {data.projects.length}
        </div>
      </div>
    </aside>
  )
}

export default ShortenerPanel
