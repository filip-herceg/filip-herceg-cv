import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import ContactPage from '@/app/contact/page'

// Mock fetch
const originalFetch = global.fetch

describe('ContactPage', () => {
  afterEach(() => {
    global.fetch = originalFetch as any
  })

  function fillAndSubmit() {
  const name = screen.getByRole('textbox', { name: /name/i })
  const email = screen.getByRole('textbox', { name: /email/i })
  const msg = screen.getByRole('textbox', { name: /message/i })
    fireEvent.change(name, { target: { value: 'Tester' } })
    fireEvent.change(email, { target: { value: 'tester@example.com' } })
    fireEvent.change(msg, { target: { value: 'Hi there' } })
    fireEvent.submit(msg.closest('form')!)
  }

  it('submits successfully (sent state)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    render(<ContactPage />)
    fillAndSubmit()
    await waitFor(() => expect(screen.getByText(/Sent!/)).toBeInTheDocument())
  })

  it('handles error state', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    render(<ContactPage />)
    fillAndSubmit()
    await waitFor(() => expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument())
  })
})
