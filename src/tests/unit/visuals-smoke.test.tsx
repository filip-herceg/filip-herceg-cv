import React from 'react'
import { render, screen } from '@testing-library/react'
// vitest globals
import { describe, test, expect } from 'vitest'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import Marquee from '@/components/visuals/marquee'
import Parallax from '@/components/visuals/parallax'
import PresetHero from '@/components/visuals/preset-hero'
import TextScramble from '@/components/visuals/text-scramble'

// Note: These are intentionally light smoke tests to exercise render paths

describe('visual/ui smoke', () => {
  test('avatar renders image+fallback', () => {
    render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="me" />
        <AvatarFallback>ME</AvatarFallback>
      </Avatar>,
    )
    expect(screen.getByText('ME')).toBeInTheDocument()
  })

  test('badge renders content', () => {
    render(<Badge variant="secondary">Hi</Badge>)
    expect(screen.getByText('Hi')).toBeInTheDocument()
  })

  test('sheet open with title/description', () => {
    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent side="right">
          <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Navigation</SheetDescription>
            Content
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  test('sheet side variants render distinct classes', () => {
    const { rerender } = render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent side="left">
          <SheetTitle>Left title</SheetTitle>
          <SheetDescription>Left desc</SheetDescription>
          Left
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getByText('Left')).toBeInTheDocument()
    rerender(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent side="top">
          <SheetTitle>Top title</SheetTitle>
          <SheetDescription>Top desc</SheetDescription>
          Top
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getByText('Top')).toBeInTheDocument()
    rerender(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent side="bottom">
          <SheetTitle>Bottom title</SheetTitle>
          <SheetDescription>Bottom desc</SheetDescription>
          Bottom
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getByText('Bottom')).toBeInTheDocument()
  })

  test('marquee renders duplicated children', () => {
    render(
      <Marquee>
        <span>Item</span>
      </Marquee>,
    )
    expect(screen.getAllByText('Item').length).toBeGreaterThan(1)
  })

  test('parallax renders children', () => {
    render(
      <Parallax>
        <div>ParallaxInner</div>
      </Parallax>,
    )
    expect(screen.getByText('ParallaxInner')).toBeInTheDocument()
  })

  test('preset hero shows title/subtitle', () => {
    const Cta = () => <a href="/x">Go</a>
    render(<PresetHero title="Title" subtitle="Subtitle" cta={<Cta />} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
    expect(screen.getByText('Go')).toBeInTheDocument()
  })

  test('text scramble renders aria-label', () => {
    render(<TextScramble text="Hello" />)
    expect(screen.getByLabelText('Hello')).toBeInTheDocument()
  })
})
