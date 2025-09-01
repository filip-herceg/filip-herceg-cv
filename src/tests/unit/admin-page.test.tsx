import { render, screen } from '@testing-library/react'
import { vi, describe, test, expect } from 'vitest'
import * as session from '@/lib/auth/session'
import * as context from '@/lib/auth/context'

// NOTE: We mock before importing the page to avoid circular init issues.

vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error('REDIRECT:' + url) } }))

// Mock cookie store so buildAuthContext sees an authenticated cookie token
vi.mock('@/lib/auth/cookies', () => ({
  // Provide minimal compatible implementation; no inheritance from real class
  NextCookieStore: class MockStore {
    get(name: string) { if (name) return { name, value: 'sid', Path: '/' } as any }
    async init() { return this }
  }
}))

// Import after mocks so the page gets the mocked cookie store
const AdminHome = (await import('@/app/admin/page')).default

describe('admin page', () => {
  test('redirects when not authenticated', async () => {
    vi.spyOn(session, 'currentUser').mockResolvedValue({ user: null } as any)
    vi.spyOn(context, 'buildAuthContext').mockReturnValue({} as any)
    await expect(AdminHome()).rejects.toThrow('REDIRECT:/login?next=/admin')
  })
  test('renders dashboard when authenticated', async () => {
    vi.spyOn(session, 'currentUser').mockResolvedValue({ user: { id: 'u1', username: 'admin' } } as any)
    vi.spyOn(context, 'buildAuthContext').mockReturnValue({} as any)
    const ui = await AdminHome()
    render(ui as any)
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/admin$/)).toBeInTheDocument()
  })
})
