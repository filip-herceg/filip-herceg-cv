import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RovingReorder from '@/components/a11y/RovingReorder'

function setup(items: string[]) {
  let state = items
  const onReorder = (next: string[]) => { state = next }
  render(
    <RovingReorder
      items={state}
      onReorder={onReorder}
      getId={(s)=>s}
      getLabel={(s)=>s}
      ariaLabel="Demo"
      renderItem={(s)=> <div>{s}</div>}
    />
  )
  return { get state() { return state } }
}

describe('RovingReorder', () => {
  it('supports lift, move with arrows, drop, and announces', () => {
    const h = setup(['A','B','C'])
    const items = screen.getAllByTestId('roving-item')
    // Focus first
    items[0].focus()
    // Lift first
    fireEvent.keyDown(items[0], { key: ' ' })
    // Move down
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    // Drop
    fireEvent.keyDown(items[1], { key: 'Enter' })
    expect(h.state).toEqual(['B','A','C'])
    expect(screen.getByTestId('roving-live').textContent).toMatch(/dropped/)
  })

  it('escape cancels and restores order', () => {
    const h = setup(['A','B'])
    const items = screen.getAllByTestId('roving-item')
    items[0].focus()
    fireEvent.keyDown(items[0], { key: ' ' })
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    // Cancel
    fireEvent.keyDown(items[1], { key: 'Escape' })
    expect(h.state).toEqual(['A','B'])
    expect(screen.getByTestId('roving-live').textContent).toMatch(/cancelled/i)
  })
})
