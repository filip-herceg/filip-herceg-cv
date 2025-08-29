import { describe, it, expect } from 'vitest'
import React from 'react'
import SitePlaceholder from '@/app/site/page'

describe('Site placeholder page', () => {
  it('renders (returns null) without throwing', () => {
    const el = SitePlaceholder()
    expect(el).toBeNull()
  })

  it('js re-export executes', async () => {
    // Dynamic import to execute page.js re-export line
    const mod = await import('@/app/site/page.js')
    expect(mod.default).toBe(SitePlaceholder)
  })
})
