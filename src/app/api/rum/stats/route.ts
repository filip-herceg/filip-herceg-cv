import { NextResponse } from 'next/server'
import { stats } from '@/lib/rum'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(stats())
}
