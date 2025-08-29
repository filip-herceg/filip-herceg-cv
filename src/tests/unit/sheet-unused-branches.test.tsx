import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Sheet, SheetContent, SheetHeader, SheetFooter } from '@/components/ui/sheet'

// Exercise header/footer/title/description always-present offscreen elements plus ensure children render.

describe('Sheet extra structure', () => {
  it('renders header/footer/title/description', () => {
    render(
      <Sheet open>
        <SheetContent side="left">
          <SheetHeader>Head</SheetHeader>
          <SheetFooter>Foot</SheetFooter>
        </SheetContent>
      </Sheet>
    )
    // Visible header/footer children
    expect(screen.getByText('Head')).toBeInTheDocument()
    expect(screen.getByText('Foot')).toBeInTheDocument()
    // Offscreen title/description inserted automatically have sr-only text
    expect(screen.getByText('Panel')).toBeInTheDocument()
    expect(screen.getByText('Panel content')).toBeInTheDocument()
  })
})
