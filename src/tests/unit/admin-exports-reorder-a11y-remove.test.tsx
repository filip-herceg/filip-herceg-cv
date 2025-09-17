import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Client from '@/app/admin/exports/ui'

const fetchMock = vi.fn()
;(globalThis as any).fetch = fetchMock

function initialRow() {
  return [{
    id: 'cfg1', name: 'Cfg', presetType: 'COMPREHENSIVE', sections: [{ key: 'PROFILE' }, { key: 'SKILLS' }, { key: 'PROJECTS' }],
    density: 'normal' as const, colorMode: 'auto' as const, paperSize: 'A4' as const, version: 1,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }]
}

describe('Admin Exports UI reorder remove still works', () => {
  it('remove button still removes', () => {
    render(<Client initial={initialRow()} />)
    fireEvent.click(screen.getByText('New'))
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    const count = removeButtons.length
    fireEvent.click(removeButtons[removeButtons.length - 1])
    expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(count - 1)
  })
})
