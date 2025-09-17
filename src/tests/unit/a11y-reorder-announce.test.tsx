import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RovingReorder from '@/components/a11y/RovingReorder'

describe('RovingReorder announcements', () => {
  it('announces lift and move', () => {
    let state = ['A','B']
    const onReorder = (next: string[]) => { state = next }
    render(<RovingReorder items={state} onReorder={onReorder} getId={(s)=>s} getLabel={(s)=>s} renderItem={(s)=> <div>{s}</div>} />)
    const items = screen.getAllByTestId('roving-item')
    items[0].focus()
    fireEvent.keyDown(items[0], { key: ' ' })
    expect(screen.getByTestId('roving-live').textContent).toMatch(/lifted/i)
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(screen.getByTestId('roving-live').textContent).toMatch(/moved/i)
  })
})
