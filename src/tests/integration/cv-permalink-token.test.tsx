import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import ShortModeContainer from '@/components/cv/ShortModeContainer'
import { sampleCvData, sampleCvDesign } from '@/lib/cv/sample-data'
import { decodePreset } from '@/lib/cv/permalink'

vi.mock('next/navigation', () => {
  (globalThis as any).__replaces = [] as string[]
  return {
    useRouter: () => ({ replace: (url: string) => { (globalThis as any).__replaces.push(url) } }),
    usePathname: () => '/cv',
  }
})

// Polyfill clipboard
Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

// Polyfill atob/btoa in case tests run in Node without them
if (!(globalThis as any).btoa) {
  ;(globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
  ;(globalThis as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary')
}

describe('ShortModeContainer permalink token integration', () => {
  it('updates URL with cv token and token decodes selection', async () => {
    const firstSkill = sampleCvData.skills[0]
    render(
      <ShortModeContainer
        data={sampleCvData}
        design={sampleCvDesign}
        initialSelection={{
          mode: 'short',
          skills: sampleCvData.skills.map(s => s.id),
          projects: sampleCvData.projects.map(p => p.id)
        }}
      />
    )

    const cb = screen.getByRole('checkbox', { name: firstSkill.name }) as HTMLInputElement
    fireEvent.click(cb)
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))

    const calls: string[] = (globalThis as any).__replaces
    expect(calls.length).toBeGreaterThan(0)
    const last = calls[calls.length - 1]
    expect(last).toMatch(/cv=/)

    const token = /cv=([^&]+)/.exec(last)?.[1]
    expect(token).toBeTruthy()
    if (token) {
      const decoded = await decodePreset(token)
      expect(decoded.ok).toBe(true)
      if (decoded.ok) {
        expect(decoded.preset.mode).toBe('short')
        // Ensure removed skill not present
        expect(decoded.preset.skills).not.toContain(firstSkill.id)
      }
    }
  })

  it('copies tokenized permalink to clipboard', async () => {
    render(
      <ShortModeContainer
        data={sampleCvData}
        design={sampleCvDesign}
        initialSelection={{ mode: 'short', skills: [sampleCvData.skills[0].id], projects: [sampleCvData.projects[0].id] }}
      />
    )
    const copyBtn = await screen.findByRole('button', { name: /permalink kopieren/i })
  await act(async () => { fireEvent.click(copyBtn) })
  await waitFor(() => expect((navigator.clipboard.writeText as any).mock.calls.length).toBeGreaterThan(0))
  const calls: string[] = (navigator.clipboard.writeText as any).mock.calls.map((c: any[]) => c[0])
  expect(calls[calls.length - 1]).toMatch(/cv=/)
  })
})
