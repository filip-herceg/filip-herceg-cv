import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock prisma client to avoid real DB env requirements
vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrisma {
    adminUser = { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() }
    session = { create: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() }
  }
}))

// Memory cookie store substitute
class MemStore { private readonly m = new Map<string,string>(); get(n:string){ const v=this.m.get(n); return v && { value: v } } set(n:string,v:string){ this.m.set(n,v) } delete(n:string){ this.m.delete(n) } }

import { buildAuthContext } from '@/lib/auth/context'

describe('auth context (F17)', () => {
  const OLD = process.env.REDIS_URL
  beforeEach(() => { delete process.env.REDIS_URL })

  it('builds context with memory rate limiter when REDIS_URL unset', () => {
    const ctx = buildAuthContext({ store: new MemStore() as any })
    expect(ctx.config.sessionCookieName).toBeTruthy()
    // memory limiter exposes recordFailure/clear via prototype; duck-verify
    expect(typeof (ctx.rateLimiter as any).recordFailure).toBe('function')
  })

  it('falls back gracefully when REDIS_URL set but ioredis missing', () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const ctx = buildAuthContext({ store: new MemStore() as any })
    expect(ctx.rateLimiter).toBeTruthy()
    // Should still behave like memory fallback (no thrown error)
    expect(typeof (ctx.rateLimiter as any).recordFailure).toBe('function')
    process.env.REDIS_URL = OLD
  })
})
