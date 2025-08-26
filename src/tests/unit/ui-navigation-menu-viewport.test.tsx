import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent } from '@/components/ui/navigation-menu'

// Tests viewport={false} branch styling / structure

describe('NavigationMenu viewport=false branch', () => {
  it('renders without viewport element', () => {
    const { container } = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
            <NavigationMenuContent>Content</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    )
    expect(container.querySelector('[data-slot="navigation-menu-viewport"]')).toBeNull()
  })
})
