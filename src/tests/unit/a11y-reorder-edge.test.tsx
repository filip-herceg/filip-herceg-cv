import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RovingReorder from '@/components/a11y/RovingReorder'

describe('RovingReorder edges', () => {
  it('does nothing on arrow beyond bounds', () => {
    let state = ['A']
    const onReorder = (next: string[]) => { state = next }
    render(<RovingReorder items={state} onReorder={onReorder} getId={(s)=>s} getLabel={(s)=>s} renderItem={(s)=> <div>{s}</div>} />)
    const [item] = screen.getAllByTestId('roving-item')
    item.focus()
    fireEvent.keyDown(item, { key: ' ' })
    fireEvent.keyDown(item, { key: 'ArrowUp' })
    fireEvent.keyDown(item, { key: 'ArrowDown' })
    fireEvent.keyDown(item, { key: 'Enter' })
    expect(state).toEqual(['A'])
  })
})
