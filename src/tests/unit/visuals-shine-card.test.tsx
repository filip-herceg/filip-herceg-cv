import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ShineCard from '@/components/visuals/shine-card'

// Basic interaction: mouse move + leave triggers motion value updates (can't assert transforms easily, but event handlers run)

describe('ShineCard interactions', () => {
  it('handles mouse move and leave safely', () => {
    const { getByText } = render(<ShineCard><div>Inner</div></ShineCard>)
    const el = getByText('Inner').parentElement!.parentElement! // motion wrappers
    fireEvent.mouseMove(el, { clientX: 10, clientY: 10 })
    fireEvent.mouseLeave(el)
    expect(el).toBeTruthy()
  })
})
