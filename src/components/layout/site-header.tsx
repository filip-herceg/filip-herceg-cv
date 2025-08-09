"use client"
import Link from 'next/link'
import { useState } from 'react'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/projects', label: 'Projects' },
    { href: '/contact', label: 'Contact' },
  ]
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur bg-background/70 border-b">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold">Filip Herceg</Link>
        <nav className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList>
              {links.map(l => (
                <NavigationMenuItem key={l.href}>
                  <Link href={l.href} legacyBehavior passHref>
                    <NavigationMenuLink className="px-3 py-2 text-sm hover:underline">
                      {l.label}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden px-3 py-2 text-sm border rounded">Menu</SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-4 pt-10">
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-lg">
                {l.label}
              </Link>
            ))}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
