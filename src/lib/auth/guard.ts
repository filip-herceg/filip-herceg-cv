import { currentUser } from './session'
import { failure } from './types'
import type { AuthContext, HandlerResult } from './types'

// Ensures an authenticated admin session; returns user or an UNAUTHORIZED HandlerResult
export async function requireAdmin(ctx: AuthContext): Promise<HandlerResult<{ id: string; username: string }>> {
  const { user } = await currentUser(ctx)
  if (!user) return failure(401, { error: 'UNAUTHORIZED' })
  return { ok: true, status: 200, body: { id: user.id, username: user.username } }
}
