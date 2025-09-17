import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RovingReorder from '@/components/a11y/RovingReorder'

describe('RovingReorder boundary movement', () => {
  it('does not move beyond list bounds while lifting', () => {
    let state = ['A','B']
    const onReorder = (next: string[]) => { state = next }
    render(<RovingReorder items={state} onReorder={onReorder} getId={(s)=>s} getLabel={(s)=>s} renderItem={(s)=> <div>{s}</div>} />)
    const items = screen.getAllByTestId('roving-item')
    items[0].focus()
    fireEvent.keyDown(items[0], { key: ' ' })
    fireEvent.keyDown(items[0], { key: 'ArrowUp' })
    fireEvent.keyDown(items[0], { key: 'Enter' })
    expect(state).toEqual(['A','B'])
  })
})
