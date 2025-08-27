import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/site-header'
import * as nav from 'next/navigation'

describe('SiteHeader i18n', () => {
  it('renders German labels when locale segment present and switches to English', () => {
    const push = vi.fn()
    vi.spyOn(nav,'usePathname').mockReturnValue('/de')
    vi.spyOn(nav,'useRouter').mockReturnValue({ push } as any)
    render(<SiteHeader />)
    expect(screen.getByRole('link',{name:'Start'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'English'}))
    expect(push).toHaveBeenCalledWith('/')
  })
})