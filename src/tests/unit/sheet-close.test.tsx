import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'

function Demo() {
  const [open, setOpen] = useState(true)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger data-testid="trigger">Open</SheetTrigger>
      <SheetContent side="right">
        <div>Drawer Body</div>
      </SheetContent>
    </Sheet>
  )
}

describe('Sheet close animation', () => {
  it('closes when close button clicked', async () => {
    render(<Demo />)
    const body = screen.getByText('Drawer Body')
    expect(body).toBeInTheDocument()
    // find close button by its sr-only text
    const close = screen.getByRole('button', { name: /close/i })
    fireEvent.click(close)
    await waitFor(() => {
      // body should eventually be removed
      expect(screen.queryByText('Drawer Body')).toBeNull()
    })
  })
})
