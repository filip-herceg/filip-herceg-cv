// Auth context & handler result types (framework-agnostic)
import type { Counter, Gauge } from 'prom-client'
import type { PrismaClient } from '@prisma/client'

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'lax' | 'strict' | 'none'
  path?: string
  expires?: Date
  maxAge?: number
}

export interface CookieStore {
  get(name: string): { value: string } | undefined
  set(name: string, value: string, options: CookieOptions): void
  delete(name: string, options?: { path?: string }): void
  // test-only convenience (no-op for Next impl)
  all?(): Record<string, { value: string; options?: CookieOptions }>
}

export interface AuthMetrics {
  loginAttempts: Counter<'result'>
  activeSessions: Gauge<string>
}

export interface AuthConfig {
  sessionCookieName: string
  csrfCookieName: string
  sessionTtlMs: number
  slidingRenewalFraction: number // renew when remaining < total * fraction
  bootstrap: { username: string; password?: string }
  production: boolean
}

export interface TimeAndRandom {
  now(): number
  randomBytes(size: number): Buffer
  sleep(ms: number): Promise<void>
}

export interface AuthContext {
  prisma: PrismaClient
  cookies: CookieStore
  metrics: AuthMetrics
  config: AuthConfig
  clock: TimeAndRandom
  rateLimiter: RateLimiter
}

export interface RateLimiterRecordResult { failCount: number; delayMs: number }
export interface RateLimiter {
  recordFailure(key: string): Promise<RateLimiterRecordResult>
  clear(key: string): Promise<void>
  backoffMs(failCount: number): number
}

// SessionStore abstraction (future Redis/memory). Prisma remains source of truth today; this lets us
// plug a distributed store without touching handler logic.
export interface SessionStore {
  create(userId: string, expiresAt: Date): Promise<{ id: string }>
  delete(id: string): Promise<void>
  find(id: string): Promise<{ id: string; userId: string; expiresAt: Date } | null>
  extend(id: string, expiresAt: Date): Promise<void>
  countActive(now: Date): Promise<number>
}

// Generic handler instruction pattern
export interface CookieInstructionSet {
  set?: Array<{ name: string; value: string; options: CookieOptions }>
  delete?: Array<{ name: string; options?: { path?: string } }>
}

export interface HandlerSuccess<T extends Record<string, unknown> = Record<string, unknown>> {
  ok: true
  status: number
  body: T
  cookies?: CookieInstructionSet
}

export interface HandlerError {
  ok: false
  status: number
  body: { error: string; [k: string]: unknown }
  cookies?: CookieInstructionSet
}

export type HandlerResult<T extends Record<string, unknown> = Record<string, unknown>> = HandlerSuccess<T> | HandlerError

export function success<T extends Record<string, unknown>>(status: number, body: T, cookies?: CookieInstructionSet): HandlerSuccess<T> {
  return { ok: true, status, body, cookies }
}
export function failure(status: number, body: { error: string; [k: string]: unknown }, cookies?: CookieInstructionSet): HandlerError { return { ok: false, status, body, cookies } }
