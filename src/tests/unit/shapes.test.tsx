import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Grid from '@/components/cv/shapes/Grid'
import Wave from '@/components/cv/shapes/Wave'

// Minimal smoke tests to cover Grid & Wave shape components

describe('cv shapes', () => {
  it('renders Grid svg with pattern id', () => {
    const { container } = render(<Grid className="h-4 w-4" accent="#000" opacity={0.5} />)
    const pattern = container.querySelector('pattern#cv-grid')
    expect(pattern).toBeTruthy()
  })

  it('renders Wave path with generated d attribute', () => {
    const { container } = render(<Wave className="h-4 w-4" seed={3} />)
    const path = container.querySelector('path')
    expect(path?.getAttribute('d')).toMatch(/M 0/) // basic path existence
  })
})
