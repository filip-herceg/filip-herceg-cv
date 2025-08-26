import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/ui/card'

// Simple mount tests to exercise side variants & card subcomponents
function renderSheet(side: any) {
  return render(
    <Sheet open>
      <SheetContent side={side} data-testid={`sheet-${side}`}>
        <div>Body</div>
      </SheetContent>
    </Sheet>
  )
}

describe('Sheet & Card components', () => {
  ;(['left','right','top','bottom'] as const).forEach(side => {
    it(`renders sheet side variant: ${side}`, () => {
      renderSheet(side)
      // content is portal mounted; query by test id
      expect(screen.getByTestId(`sheet-${side}`)).toBeInTheDocument()
    })
  })

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Desc')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
