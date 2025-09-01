import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'

// Covers side conditional class branches by rendering each variant

describe('Sheet side variants', () => {
  afterEach(() => cleanup())
  ;(['right','left','top','bottom'] as const).forEach(side => {
    it(`renders side=${side}`, () => {
      render(
        <Sheet open>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent side={side}>Body</SheetContent>
        </Sheet>
      )
      // Content rendered in a portal (document.body), not within RTL container
      const content = document.querySelector('[data-slot="sheet-content"]')
      expect(content).toBeTruthy()
      expect(content!.textContent).toContain('Body')
      // ensure class contains side-specific directive keyword (slide-in-from-right, etc.)
      expect(content!.className).toMatch(new RegExp(side))
    })
  })
})
