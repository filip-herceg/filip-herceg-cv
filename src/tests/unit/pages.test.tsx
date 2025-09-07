import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import AboutPage from '@/app/about/page'
import ProjectsPage from '@/app/projects/page'
import ContactPage from '@/app/contact/page'

// Helper to render CV with/without short mode. Page component is async (server component style) so we await the element.
const renderCv = async (mode?: string) => {
  const { default: CvPage } = await import('@/app/cv/page')
  const element = await CvPage({ searchParams: mode ? { mode } : {} } as any)
  render(element as any)
}

describe('Static pages', () => {
  it('renders About page heading', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument()
  })
  it('renders Projects page heading', () => {
    render(<ProjectsPage />)
    expect(screen.getByRole('heading', { name: /projects/i })).toBeInTheDocument()
  })
  it('renders Contact page heading', () => {
    render(<ContactPage />)
    expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument()
  })
})

describe('CV page', () => {
  it('renders full CV (non-short mode) with placeholder when DB empty', async () => {
    await renderCv()
    expect(screen.getByText(/Jane Developer/)).toBeInTheDocument()
  })
  it('renders short mode when mode=short', async () => {
    vi.doMock('next/dynamic', () => ({ __esModule: true, default: (importer: any) => importer() }))
    await renderCv('short')
    await waitFor(() => expect(screen.getByTestId('short-builder')).toBeInTheDocument())
  })
  it('short mode selection change triggers router.replace with cv token (URL sync)', async () => {
    vi.doMock('next/dynamic', () => ({ __esModule: true, default: (importer: any) => importer() }))
    await act(async () => {
      await renderCv('short')
    })
    const panel = await screen.findByTestId('short-builder')
    const firstCheckbox = panel.querySelector('input[type="checkbox"]')
    if (firstCheckbox) {
      await act(async () => {
        (firstCheckbox as HTMLElement).click()
        await new Promise(requestAnimationFrame)
      })
    }
    const mockRouter = (globalThis as any).__mockRouter
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled()
      const arg = mockRouter.replace.mock.calls[0][0]
      expect(arg).toMatch(/cv=/)
    })
  })
})
