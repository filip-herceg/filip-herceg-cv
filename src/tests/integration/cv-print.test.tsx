import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CvPrintPage from '@/app/cv/print/page'

describe('<CvPrintPage />', () => {
  it('renders CV content with person name', async () => {
    // The page component is async (Next.js server component style). We await its resolution.
    const Page = await CvPrintPage({ searchParams: { skills: 'ts' } } as any)
    render(Page as any)
    expect(screen.getByText(/Jane Developer/)).toBeInTheDocument()
  })
})
