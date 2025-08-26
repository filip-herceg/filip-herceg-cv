import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/font/google Inter to avoid runtime function call issues in test env
vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'mock-inter' }),
}))

import RootLayout from '@/app/layout'

describe('<RootLayout />', () => {
  it('renders children and JSON-LD script', () => {
    render(<RootLayout><div data-testid="child">Child</div></RootLayout>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    // Find the JSON-LD script tag
    const script = document.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })
})
