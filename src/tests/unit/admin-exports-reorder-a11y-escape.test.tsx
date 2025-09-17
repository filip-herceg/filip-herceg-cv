import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Client from '@/app/admin/exports/ui'

const fetchMock = vi.fn()
;(globalThis as any).fetch = fetchMock

function initialRow() {
  return [{
    id: 'cfg1', name: 'Cfg', presetType: 'COMPREHENSIVE', sections: [{ key: 'PROFILE' }, { key: 'SKILLS' }],
    density: 'normal' as const, colorMode: 'auto' as const, paperSize: 'A4' as const, version: 1,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }]
}

describe('Admin Exports UI reorder cancel', () => {
  it('escape cancels and announces', () => {
    render(<Client initial={initialRow()} />)
    fireEvent.click(screen.getByText('New'))
    const items = screen.getAllByTestId('roving-item')
    items[0].focus()
    fireEvent.keyDown(items[0], { key: ' ' })
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    fireEvent.keyDown(items[1], { key: 'Escape' })
    expect(screen.getByTestId('roving-live').textContent).toMatch(/cancelled/i)
  })
})
