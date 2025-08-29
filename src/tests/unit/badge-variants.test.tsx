import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '@/components/ui/badge'

// Cover outline + destructive + default variant branches (secondary already in visuals smoke)

describe('Badge variants', () => {
  it('renders outline variant', () => {
    render(<Badge variant="outline">O</Badge>)
    expect(screen.getByText('O')).toBeInTheDocument()
  })
  it('renders destructive variant', () => {
    render(<Badge variant="destructive">D</Badge>)
    expect(screen.getByText('D')).toBeInTheDocument()
  })
  it('renders default variant (implicit)', () => {
    render(<Badge>Def</Badge>)
    expect(screen.getByText('Def')).toBeInTheDocument()
  })
})
