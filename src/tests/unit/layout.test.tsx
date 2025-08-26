import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/font/google Inter to avoid runtime function call issues in test env
vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'mock-inter' }),
}))

import RootLayout from '@/app/layout'

// Helper: render RootLayout but inject only body subtree into RTL (avoids <html> nesting warning)
function renderBodyFromLayout(child: React.ReactNode) {
  const tree = RootLayout({ children: child }) as React.ReactElement
  // tree = <html><body>...</body></html>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyEl: any = (tree as any).props.children
  return render(<>{bodyEl.props.children}</>)
}

describe('<RootLayout />', () => {
  it('renders children and JSON-LD script', () => {
  renderBodyFromLayout(<div data-testid="child">Child</div>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    // Find the JSON-LD script tag
    const script = document.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })
})
