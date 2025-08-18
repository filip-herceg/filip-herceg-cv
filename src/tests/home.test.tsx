import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('renders hero heading', () => {
    const { getByText } = render(<HomePage />)
    expect(getByText(/Hi, I'm Filip Herceg/i)).toBeTruthy()
  })
})
