import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import MotionToggle from '@/components/layout/motion-toggle'

describe('MotionToggle', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    localStorage.clear()
  })

  it('initializes from localStorage (reduced)', () => {
    localStorage.setItem('reduce-motion', 'true')
    render(<MotionToggle />)
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
    expect(screen.getByRole('button', { name: /enable motion/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles add/remove class and persists', () => {
    render(<MotionToggle />)
    const btn = screen.getByRole('button', { name: /reduce motion/i })
    fireEvent.click(btn)
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
    expect(localStorage.getItem('reduce-motion')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /enable motion/i }))
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false)
    expect(localStorage.getItem('reduce-motion')).toBe('false')
  })
})
