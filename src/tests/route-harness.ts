// Simple route test harness: provides mock of next/headers cookies and helper to call route handlers.
// Approach: We patch global "next/headers" import via vi.mock in each test to supply a MemoryCookieStore backing.
import { MemoryCookieStore } from '@/lib/auth/cookies'

export interface HarnessContext {
  store: MemoryCookieStore
  setAdminSession(sessionId: string): void
}

export function createHarness(): HarnessContext {
  const store = new MemoryCookieStore()
  return {
    store,
    setAdminSession(sessionId: string) {
      store.set('cv_admin_session', sessionId, { path: '/', httpOnly: true })
    },
  }
}

// Utility to craft a Request with JSON body
export function jsonRequest(url: string, body: any): Request {
  return new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
}

export function deleteRequest(url: string): Request {
  return new Request(url, { method: 'DELETE' })
}