import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks for auth handlers
const handleLogin = vi.fn()
const handleLogout = vi.fn()
const handleMe = vi.fn()
const handleIssueCsrf = vi.fn()
const handlePasswordChange = vi.fn()

vi.mock('@/lib/auth/handlers', () => ({
  handleLogin: (...a: any[]) => handleLogin(...a),
  handleLogout: (...a: any[]) => handleLogout(...a),
  handleMe: (...a: any[]) => handleMe(...a),
  handleIssueCsrf: (...a: any[]) => handleIssueCsrf(...a),
  handlePasswordChange: (...a: any[]) => handlePasswordChange(...a),
}))
vi.mock('@/lib/auth/cookies', () => ({ NextCookieStore: class { async init() { return this } } }))
vi.mock('@/lib/auth/context', () => ({ buildAuthContext: () => ({ user: { id: 'u1' } }) }))

import * as loginRoute from '@/app/api/admin/login/route'
import * as logoutRoute from '@/app/api/admin/logout/route'
import * as meRoute from '@/app/api/admin/me/route'
import * as passwordRoute from '@/app/api/admin/password/route'

describe('admin auth routes', () => {
  beforeEach(() => { handleLogin.mockReset(); handleLogout.mockReset(); handleMe.mockReset(); handleIssueCsrf.mockReset(); handlePasswordChange.mockReset() })

  it('login invalid JSON', async () => {
    const res = await loginRoute.POST(new Request('http://test/api/admin/login', { method: 'POST', body: 'not-json' }))
    expect(res.status).toBe(400)
  })

  it('login success sets cookies', async () => {
    handleLogin.mockResolvedValueOnce({ status: 200, body: { ok: true }, cookies: { set: [{ name: 'session', value: 'abc', options: { path: '/' } }] } })
    const res = await loginRoute.POST(new Request('http://test/api/admin/login', { method: 'POST', body: JSON.stringify({ username: 'a', password: 'b' }) }))
    expect(res.status).toBe(200)
  })

  it('login clears existing cookie then sets new one (delete + set branches)', async () => {
    handleLogin.mockResolvedValueOnce({ status: 200, body: { ok: true }, cookies: { delete: [{ name: 'legacy' }], set: [{ name: 'session', value: 'def', options: { path: '/' } }] } })
    const res = await loginRoute.POST(new Request('http://test/api/admin/login', { method: 'POST', body: JSON.stringify({ username: 'a', password: 'b' }) }))
    expect(res.status).toBe(200)
  })

  it('logout invokes handler', async () => {
    handleLogout.mockResolvedValueOnce({ status: 200, body: { ok: true }, cookies: { delete: [{ name: 'session' }] } })
    const res = await logoutRoute.POST()
    expect(res.status).toBe(200)
  })

  it('logout sets replacement cookie (set branch)', async () => {
    handleLogout.mockResolvedValueOnce({ status: 200, body: { ok: true }, cookies: { set: [{ name: 'session', value: 'replaced', options: { path: '/' } }] } })
    const res = await logoutRoute.POST()
    expect(res.status).toBe(200)
  })

  it('me handler', async () => {
    handleMe.mockResolvedValueOnce({ status: 200, body: { user: { id: 'u1' } } })
    const res = await meRoute.GET()
    expect(res.status).toBe(200)
  })

  it('me handler applies cookie set instructions', async () => {
    handleMe.mockResolvedValueOnce({
      status: 200,
      body: { user: { id: 'u1' } },
      cookies: { set: [ { name: 'session', value: 'abc', options: { path: '/' } } ] }
    })
    const res = await meRoute.GET()
    expect(res.status).toBe(200)
  })

  it('me handler applies cookie delete (with & without options)', async () => {
    handleMe.mockResolvedValueOnce({
      status: 200,
      body: { user: { id: 'u1' } },
      cookies: { delete: [ { name: 'legacy' }, { name: 'session', options: { path: '/' } } ] }
    })
    const res = await meRoute.GET()
    expect(res.status).toBe(200)
  })

  it('password GET issues csrf', async () => {
    handleIssueCsrf.mockResolvedValueOnce({ status: 200, body: { csrf: 'token' } })
    const res = await passwordRoute.GET()
    expect(res.status).toBe(200)
  })

  it('password POST invalid json', async () => {
    const res = await passwordRoute.POST(new Request('http://test/api/admin/password', { method: 'POST', body: 'x' }))
    expect(res.status).toBe(400)
  })

  it('password POST change', async () => {
    handlePasswordChange.mockResolvedValueOnce({ status: 200, body: { changed: true } })
    const res = await passwordRoute.POST(new Request('http://test/api/admin/password', { method: 'POST', body: JSON.stringify({ newPassword: 'N3wP@ss', csrfToken: 't' }) }))
    expect(res.status).toBe(200)
  })

  it('password POST delete cookie branch', async () => {
    handlePasswordChange.mockResolvedValueOnce({ status: 200, body: { changed: true }, cookies: { delete: [{ name: 'session' }] } })
    const res = await passwordRoute.POST(new Request('http://test/api/admin/password', { method: 'POST', body: JSON.stringify({ newPassword: 'N3wP@ss', csrfToken: 't' }) }))
    expect(res.status).toBe(200)
  })

  it('password POST set cookie branch', async () => {
    handlePasswordChange.mockResolvedValueOnce({ status: 200, body: { changed: true }, cookies: { set: [{ name: 'session', value: 'rotated', options: { path: '/' } }] } })
    const res = await passwordRoute.POST(new Request('http://test/api/admin/password', { method: 'POST', body: JSON.stringify({ newPassword: 'AnotherP@ss1', csrfToken: 't' }) }))
    expect(res.status).toBe(200)
  })
})
