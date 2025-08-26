import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ShortenerPanel } from '@/components/cv/ShortenerPanel'
import { sampleCvData } from '@/lib/cv/sample-data'

describe('ShortenerPanel', () => {
  const data = sampleCvData

  it('removes and re-adds a skill (branch coverage)', () => {
    const initialSel = { skills: data.skills.slice(0, 2).map(s => s.id), projects: data.projects.map(p => p.id) }
    function Harness() {
      const [sel, setSel] = useState(initialSel)
      return (
        <ShortenerPanel
          data={data}
          selection={sel as any}
          onChange={setSel as any}
          onCopyPermalink={async () => {}}
          onOpenPrint={() => {}}
          onReset={() => {}}
        />
      )
    }
    render(<Harness />)
    const skillToToggle = data.skills[0]
    const getBox = () => screen.getByRole('checkbox', { name: skillToToggle.name }) as HTMLInputElement
    expect(getBox().checked).toBe(true)
    fireEvent.click(getBox()) // remove
    expect(getBox().checked).toBe(false)
    fireEvent.click(getBox()) // re-add
    expect(getBox().checked).toBe(true)
  })

  it('reset button disabled when all selected', () => {
    const sel = { skills: data.skills.map(s=>s.id), projects: data.projects.map(p=>p.id) }
    render(<ShortenerPanel data={data} selection={sel as any} onChange={()=>{}} onCopyPermalink={async ()=>{}} onOpenPrint={()=>{}} onReset={()=>{}} />)
    const resetBtn = screen.getByRole('button', { name: /reset/i })
    expect(resetBtn).toBeDisabled()
  })
})
