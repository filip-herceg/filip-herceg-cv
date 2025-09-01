import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/de/projects'
}))

import { LocaleHead } from '@/components/layout/locale-head'

describe('<LocaleHead />', () => {
  it('sets html lang to detected locale and renders hreflang links', async () => {
    render(<LocaleHead />)
    await waitFor(() => {
      const links = Array.from(document.querySelectorAll('link[rel="alternate"][data-locale-alt="true"]'))
      expect(links.length).toBeGreaterThan(0)
    })
    expect(document.documentElement.lang).toBe('de')
    const links = Array.from(document.querySelectorAll('link[rel="alternate"][data-locale-alt="true"]'))
    const hrefLangs = links.map(l => l.getAttribute('hreflang')).sort((a, b) => a!.localeCompare(b!))
    expect(hrefLangs).toEqual(['de','en','x-default'])
  })
})
