import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RovingReorder from '@/components/a11y/RovingReorder'

describe('RovingReorder roving only', () => {
  it('changes focused item with arrows when not grabbed', () => {
    let state = ['A','B','C']
    const onReorder = (next: string[]) => { state = next }
    render(<RovingReorder items={state} onReorder={onReorder} getId={(s)=>s} getLabel={(s)=>s} renderItem={(s)=> <div>{s}</div>} />)
    const items = screen.getAllByTestId('roving-item')
    items[1].focus()
    fireEvent.keyDown(items[1], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0])
  })
})
