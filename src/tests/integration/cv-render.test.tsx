import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CvView from '@/components/cv/CvView'
import { sampleCvData, sampleCvDesign } from '@/lib/cv/sample-data'

describe('<CvView />', () => {
  it('renders person name and at least one project', () => {
    render(<CvView data={sampleCvData} design={sampleCvDesign} />)
    expect(screen.getByText(sampleCvData.person.name)).toBeInTheDocument()
    expect(screen.getByText(sampleCvData.projects[0].title)).toBeInTheDocument()
  })
  it('filters skills by selection', () => {
    render(<CvView data={sampleCvData} design={sampleCvDesign} selection={{ skills: ['ts'] }} />)
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    // A different skill should be present only if part of selection; react should be absent
    const react = screen.queryByText('React')
    expect(react).toBeNull()
  })
})
