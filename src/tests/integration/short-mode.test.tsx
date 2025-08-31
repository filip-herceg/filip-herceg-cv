/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShortModeContainer from '@/components/cv/ShortModeContainer'
import { sampleCvData, sampleCvDesign } from '@/lib/cv/sample-data'

// Minimal mock for next/navigation hooks used in ShortModeContainer
vi.mock('next/navigation', () => {
  (globalThis as any).__replaces = [] as string[]
  return {
    useRouter: () => ({ replace: (url: string) => { (globalThis as any).__replaces.push(url) } }),
    usePathname: () => '/cv',
  }
})

// Mock permalink helpers used by the ShortModeContainer (encodePreset/buildPermalink)
vi.mock('@/lib/cv/permalink', () => ({
  encodePreset: async (_p: any) => 'token',
  buildPermalink: async (base: string) => `${base}?cv=token`,
  // underscore to satisfy eslint for intentionally unused param
  decodePreset: async (_t: string) => ({ ok: true, preset: { skills: [] } }),
}))

describe('ShortModeContainer', () => {
  it('renders all skills initially and toggles one off', async () => {
    const firstSkill = sampleCvData.skills[0]
    render(
      <ShortModeContainer
        data={sampleCvData}
        design={sampleCvDesign}
        initialSelection={{
          mode: 'short',
          skills: sampleCvData.skills.map(s => s.id),
          projects: sampleCvData.projects.map(p => p.id),
        }}
      />
    )

    const panel = screen.getByTestId('short-builder')
    expect(panel).toBeInTheDocument()

    // All skills present initially
    sampleCvData.skills.forEach(s => {
      expect(screen.getByRole('checkbox', { name: s.name })).toBeChecked()
    })

  const targetCheckbox = screen.getByRole('checkbox', { name: firstSkill.name }) as HTMLInputElement
    fireEvent.click(targetCheckbox)
    expect(targetCheckbox.checked).toBe(false)
  // Allow async RAF/debounce to run (use small timeout for reliability)
  await new Promise(res => setTimeout(res, 50))
    const calls = (globalThis as any).__replaces as string[]
    expect(calls.length).toBeGreaterThan(0)
    const last = calls[calls.length - 1]
    expect(last).toMatch(/cv=/)
    const token = /cv=([^&]+)/.exec(last)?.[1]
    expect(token).toBeTruthy()
    if (token) {
      const { decodePreset } = await import('@/lib/cv/permalink')
      const decoded = await decodePreset(token)
      expect(decoded.ok).toBe(true)
      if (decoded.ok) expect(decoded.preset.skills).not.toContain(firstSkill.id)
    }

    // Ensure at least one other skill still checked
  const remainingChecked = sampleCvData.skills.slice(1).some(s => (screen.getByRole('checkbox', { name: s.name }) as HTMLInputElement).checked)
    expect(remainingChecked).toBe(true)
  })
})
