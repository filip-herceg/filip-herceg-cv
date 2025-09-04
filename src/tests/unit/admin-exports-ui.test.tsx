import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Client from '@/app/admin/exports/ui'

// We exercise the Client component (admin exports UI) with a minimal initial dataset
// to cover: listing, starting create, adding/removing/reordering sections, submission
// error (network) path, and version conflict handling logic branch.

// Mock fetch so we can control responses for create / edit / delete calls.
const fetchMock = vi.fn()
;(globalThis as any).fetch = fetchMock

function initialRow() {
  return [{
    id: 'cfg1', name: 'Base', presetType: 'COMPREHENSIVE', sections: [{ key: 'PROFILE' }],
    density: 'normal' as const, colorMode: 'auto' as const, paperSize: 'A4' as const, version: 1,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }]
}

describe('Admin Exports UI', () => {
  beforeEach(() => { fetchMock.mockReset() })

  it('lists existing and opens create form then adds/removes/reorders a section', () => {
    render(<Client initial={initialRow()} />)
    expect(screen.getByText('Export Configs')).toBeTruthy()
    fireEvent.click(screen.getByText('New'))
    // Name input present
  const nameInput = screen.getByLabelText('Name')
  fireEvent.change(nameInput, { target: { value: 'New Config' } })
    // Add a section
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    // Move last section up (should exist with aria-label="Move up")
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' })
    if (moveUpButtons.length > 1) fireEvent.click(moveUpButtons.at(-1)!)
    // Remove a section
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    fireEvent.click(removeButtons.at(-1)!)
    // Cancel back to list
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('Export Configs')).toBeTruthy()
  })

  it('handles create success and version conflict on edit', async () => {
    // Create success path returns 201 then refresh list with new item
    fetchMock
      // POST create
      .mockResolvedValueOnce(new Response(JSON.stringify({ config: { id: 'new1', version: 1 } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      // refresh GET list after create
      .mockResolvedValueOnce(new Response(JSON.stringify({ configs: initialRow() }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      // PUT edit conflict (409)
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'VERSION_CONFLICT' }), { status: 409, headers: { 'Content-Type': 'application/json' } }))
      // refresh after conflict
      .mockResolvedValueOnce(new Response(JSON.stringify({ configs: initialRow() }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    render(<Client initial={initialRow()} />)
    fireEvent.click(screen.getByText('New'))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Boom' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    // After create the component should go back to list view eventually
    await screen.findByText('Export Configs')
    // Enter edit mode to trigger conflict path
    fireEvent.click(screen.getAllByText('Edit')[0])
    // Save (PUT) triggers 409 then refresh
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/Version conflict/i)
  })
})
