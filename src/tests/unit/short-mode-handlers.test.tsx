import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.doMock('next/dynamic', () => ({ __esModule: true, default: (importer: any) => importer() }))

import { sampleCvData, sampleCvDesign } from '@/lib/cv/sample-data'
import type { CvDesign } from '@/lib/cv/schema'
import ShortModeContainer from '@/components/cv/ShortModeContainer'

const design: CvDesign = sampleCvDesign

const setupBrowserStubs = () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  const win: any = { addEventListener: vi.fn((_, cb) => cb && cb()), removeEventListener: vi.fn(), print: vi.fn() }
  const open = vi.fn().mockReturnValue(win)
  const originalOpen = window.open
  ;(window as any).open = open
  return { writeText, open, win, restore: () => { ;(window as any).open = originalOpen } }
}

describe('ShortModeContainer handlers', () => {
  it('copies permalink & toggles copied state text', async () => {
    const { writeText } = setupBrowserStubs()
    render(
      <ShortModeContainer data={sampleCvData} design={design} initialSelection={{ skills: [sampleCvData.skills[0].id], projects: [sampleCvData.projects[0].id] }} />,
    )
    const copyBtn = await screen.findByRole('button', { name: /permalink kopieren/i })
  await act(async () => { fireEvent.click(copyBtn) })
  await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(copyBtn.textContent).toMatch(/kopiert!/i)
  })

  it('opens print window and triggers print listener', async () => {
    const { open, win } = setupBrowserStubs()
  render(<ShortModeContainer data={sampleCvData} design={design} />)
    const printBtn = await screen.findByRole('button', { name: /drucken/i })
    fireEvent.click(printBtn)
    expect(open).toHaveBeenCalled()
    expect(win.print).toHaveBeenCalled()
  })

  it('reset restores full selection and disables reset button', async () => {
    render(
      <ShortModeContainer data={sampleCvData} design={design} initialSelection={{ skills: [sampleCvData.skills[0].id], projects: [sampleCvData.projects[0].id] }} />,
    )
    const resetBtn = await screen.findByRole('button', { name: /reset/i })
    expect(resetBtn).not.toBeDisabled()
    fireEvent.click(resetBtn)
    await waitFor(() => expect(resetBtn).toBeDisabled())
  })
})
