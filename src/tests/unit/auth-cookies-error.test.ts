import { describe, it, expect } from 'vitest'
import { NextCookieStore } from '@/lib/auth/cookies'

// We cannot actually call next/headers outside Next runtime; we only test thrown error branches before init

describe('NextCookieStore error branches', () => {
  it('set throws when not initialised', () => {
    const store = new NextCookieStore()
    expect(() => store.set('k','v',{ path: '/' } as any)).toThrowError('Cookie store not initialised')
  })
  it('delete throws when not initialised', () => {
    const store = new NextCookieStore()
    expect(() => store.delete('k')).toThrowError('Cookie store not initialised')
  })
})
