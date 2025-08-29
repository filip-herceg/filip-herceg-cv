import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  return NextResponse.json({ id: user.id, username: user.username })
}
