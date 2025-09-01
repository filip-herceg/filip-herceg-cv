import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ShortenerPanel } from '@/components/cv/ShortenerPanel'
import { sampleCvData } from '@/lib/cv/sample-data'

describe('ShortenerPanel', () => {
  const data = sampleCvData

  interface Sel {
    skills?: string[]
    projects?: string[]
  }

  function createHarness(initialSelection: Sel, withReset = false) {
    return function Harness() {
      const [sel, setSel] = useState<Sel>(initialSelection)
      const fullSel: Sel = { skills: data.skills.map(s => s.id), projects: data.projects.map(p => p.id) }
      return (
        <ShortenerPanel
          data={data}
            selection={sel as any}
            onChange={setSel as any}
            onCopyPermalink={async () => {}}
            onOpenPrint={() => {}}
            onReset={withReset ? (() => setSel(fullSel)) : (() => {})}
        />
      )
    }
  }

  it('toggles a skill off and back on', () => {
    const initialSel = { skills: data.skills.slice(0, 2).map(s => s.id), projects: data.projects.map(p => p.id) }
    const Harness = createHarness(initialSel)
    render(<Harness />)
    const skill = data.skills[0]
    const box = () => screen.getByRole<HTMLInputElement>('checkbox', { name: skill.name })
    expect(box().checked).toBe(true)
    fireEvent.click(box())
    expect(box().checked).toBe(false)
    fireEvent.click(box())
    expect(box().checked).toBe(true)
  })

  it('toggles a project off and back on', () => {
    const initialSel = { skills: data.skills.map(s => s.id), projects: data.projects.slice(0, 2).map(p => p.id) }
    const Harness = createHarness(initialSel)
    render(<Harness />)
    const project = data.projects[0]
    const box = () => screen.getByRole<HTMLInputElement>('checkbox', { name: project.title })
    expect(box().checked).toBe(true)
    fireEvent.click(box())
    expect(box().checked).toBe(false)
    fireEvent.click(box())
    expect(box().checked).toBe(true)
  })

  it('reset button disabled when all selected', () => {
    const full = { skills: data.skills.map(s => s.id), projects: data.projects.map(p => p.id) }
    const Harness = createHarness(full)
    render(<Harness />)
    const resetBtn = screen.getByRole<HTMLButtonElement>('button', { name: /reset/i })
    expect(resetBtn.disabled).toBe(true)
  })

  it('reset re-selects everything after manual deselect', () => {
    const full = { skills: data.skills.map(s => s.id), projects: data.projects.map(p => p.id) }
    const Harness = createHarness(full, true)
    render(<Harness />)
    // Deselect one skill
    const someSkill = data.skills[0]
    const skillBox = () => screen.getByRole<HTMLInputElement>('checkbox', { name: someSkill.name })
    fireEvent.click(skillBox())
    expect(skillBox().checked).toBe(false)
    // Reset
    const resetBtn = screen.getByRole<HTMLButtonElement>('button', { name: /reset/i })
    expect(resetBtn.disabled).toBe(false)
    fireEvent.click(resetBtn)
    expect(skillBox().checked).toBe(true)
  })

  it('cannot remove last remaining skill', () => {
    const single = { skills: [data.skills[0].id], projects: data.projects.map(p => p.id) }
    const Harness = createHarness(single)
    render(<Harness />)
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: data.skills[0].name })
    expect(box.checked).toBe(true)
    fireEvent.click(box)
    // Still checked because component prevents removing final item
    expect(box.checked).toBe(true)
  })
})
