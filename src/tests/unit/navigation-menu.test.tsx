import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuIndicator,
} from '@/components/ui/navigation-menu'

// These interaction-light tests aim to execute render/branch paths (viewport true/false)

describe('navigation menu', () => {
  it('renders with viewport (default) and trigger/content structure', async () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/a">A</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator />
      </NavigationMenu>,
    )
    expect(screen.getByText('Menu')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Menu'))
  expect(await screen.findByRole('link', { name: 'A' })).toBeInTheDocument()
  })

  it('renders without viewport when viewport={false}', async () => {
    render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu2</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/b">B</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    )
    expect(screen.getByText('Menu2')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Menu2'))
  expect(await screen.findByRole('link', { name: 'B' })).toBeInTheDocument()
  })
})
