import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AboutPage from '@/app/about/page'
import ProjectsPage from '@/app/projects/page'
import ContactPage from '@/app/contact/page'

// Helper to render CV with/without short mode. We import the page module lazily so we can mock `next/dynamic` beforehand in specific tests.
const renderCv = async (mode?: string) => {
  const { default: CvPage } = await import('@/app/cv/page')
  render(<CvPage searchParams={mode ? { mode } : {}} /> as any)
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
  it('renders full CV (non-short mode)', async () => {
    await renderCv()
    // Expect sample name present
    expect(screen.getByText(/Jane Developer/)).toBeInTheDocument()
  })
  it('renders short mode when mode=short', async () => {
    vi.doMock('next/dynamic', () => ({ __esModule: true, default: (importer: any) => importer() }))
    await renderCv('short')
    await waitFor(() => expect(screen.getByTestId('short-builder')).toBeInTheDocument())
  })
})
