import { cookies as nextCookies } from 'next/headers'
import type { CookieOptions, CookieStore } from './types'

// Next.js runtime cookie store wrapper (lazy since next/headers is request scoped)
export class NextCookieStore implements CookieStore {
  private inner: Awaited<ReturnType<typeof nextCookies>> | null = null
  private async ensure() { return this.inner ??= await nextCookies() }
  get(name: string) { return this.inner?.get(name) }
  async init() { await this.ensure(); return this }
  set(name: string, value: string, options: CookieOptions) { if (!this.inner) throw new Error('Cookie store not initialised'); this.inner.set(name, value, options) }
  delete(name: string, options?: { path?: string }) { if (!this.inner) throw new Error('Cookie store not initialised'); this.inner.delete({ name, path: options?.path }) }
}

// In-memory cookie store for tests
export class MemoryCookieStore implements CookieStore {
  private map = new Map<string, { value: string; options?: CookieOptions }>()
  get(name: string) { const v = this.map.get(name); return v && { value: v.value } }
  set(name: string, value: string, options: CookieOptions) { this.map.set(name, { value, options }) }
  delete(name: string) { this.map.delete(name) }
  all() { return Object.fromEntries(this.map.entries()) }
}
