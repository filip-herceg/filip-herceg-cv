import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuLink,
} from '@/components/ui/navigation-menu'
import { SiteHeader } from '@/components/layout/site-header'

describe('UI components', () => {
	it('renders Card structure', () => {
		render(
			<Card data-testid="card">
				<CardHeader>
					<CardTitle>Title</CardTitle>
				</CardHeader>
				<CardContent>Content</CardContent>
			</Card>,
		)
		expect(screen.getByTestId('card')).toBeInTheDocument()
		expect(screen.getByText('Title')).toBeInTheDocument()
		expect(screen.getByText('Content')).toBeInTheDocument()
	})

	it('renders NavigationMenu basic', () => {
		render(
			<NavigationMenu>
				<NavigationMenuList>
					<NavigationMenuItem>
						<NavigationMenuLink href="#">Item</NavigationMenuLink>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>,
		)
		expect(screen.getByText('Item')).toBeInTheDocument()
	})

	it('renders SiteHeader with links', () => {
		render(<SiteHeader />)
		expect(screen.getByText('Filip Herceg')).toBeInTheDocument()
		expect(screen.getByText('Projects')).toBeInTheDocument()
	})
})
