import { describe, it, expect, vi } from 'vitest'

// Mock next/headers cookies API before importing store
const mockStore = (() => {
  const map = new Map<string, any>()
  return {
    get: (n: string) => map.get(n),
    set: (n: string, v: string, _o: any) => { map.set(n, { name: n, value: v }) },
    delete: (arg: { name: string }) => { map.delete(arg.name) },
  }
})()
vi.mock('next/headers', () => ({ cookies: async () => mockStore }))

import { NextCookieStore } from '@/lib/auth/cookies'

describe('NextCookieStore wrapper (F17)', () => {
  it('get returns undefined before init and set/delete throw', async () => {
    const store = new NextCookieStore()
    expect(store.get('x')).toBeUndefined()
    expect(() => store.set('a','b',{ path: '/' })).toThrow()
    expect(() => store.delete('a')).toThrow()
  })

  it('init enables set/get/delete', async () => {
    const store = new NextCookieStore()
    await store.init()
    store.set('s','val',{ path: '/' })
    expect(store.get('s')?.value).toBe('val')
    store.delete('s')
    expect(store.get('s')).toBeUndefined()
  })
})
