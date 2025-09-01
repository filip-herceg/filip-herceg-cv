import React from 'react'
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/layout/error-boundary'

function Boom(): JSX.Element {
  throw new Error('Boom')
}

describe('ErrorBoundary', () => {
  const origError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = origError
  })

  it('renders children when no error', () => {
    render(<ErrorBoundary><div>Child OK</div></ErrorBoundary>)
    expect(screen.getByText('Child OK')).toBeInTheDocument()
  })

  it('shows fallback UI when child throws', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByText(/Try refreshing/)).toBeInTheDocument()
  })
})
