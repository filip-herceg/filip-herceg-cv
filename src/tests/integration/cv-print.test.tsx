import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CvPrintPage from '@/app/cv/print/page'

describe('<CvPrintPage />', () => {
  it('renders CV content with placeholder person name when DB empty', async () => {
    // The page component is async (Next.js server component style). We await its resolution.
    const Page = await CvPrintPage({ searchParams: { skills: 'ts' } } as any)
    render(Page as any)
  expect(screen.getByText(/Your Name/)).toBeInTheDocument()
  })
})
