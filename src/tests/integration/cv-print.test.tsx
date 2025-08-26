import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CvPrintPage from '@/app/cv/print/page'

describe('<CvPrintPage />', () => {
  it('renders CV content with person name', () => {
    render(<CvPrintPage searchParams={{ skills: 'ts' }} /> as any)
    // Uses sampleCvData.person.name (Jane Developer)
    expect(screen.getByText(/Jane Developer/)).toBeInTheDocument()
  })
})
