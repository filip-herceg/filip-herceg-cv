import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges classes', () => {
    expect(cn('px-2', false && 'hidden', 'text-sm')).toBe('px-2 text-sm')
  })
})
