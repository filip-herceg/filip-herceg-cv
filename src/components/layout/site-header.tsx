'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import dynamic from 'next/dynamic'
const Sheet = dynamic(() => import('@/components/ui/sheet').then(m => m.Sheet), { ssr: false })
const SheetContent = dynamic(() => import('@/components/ui/sheet').then(m => m.SheetContent), { ssr: false })
const SheetTrigger = dynamic(() => import('@/components/ui/sheet').then(m => m.SheetTrigger), { ssr: false })
import MotionToggle from './motion-toggle'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  // Extract current locale from leading segment (e.g., /de/about)
  const segments = pathname.split('/').filter(Boolean)
  const possibleLocale = segments[0]
  const supported = ['en','de']
  const locale = supported.includes(possibleLocale) ? possibleLocale : 'en'
  function withLocale(href: string) {
    if (locale === 'en') return href // default locale not prefixed
    return href === '/' ? `/${locale}` : `/${locale}${href}`
  }
  const { t: tHook } = useI18n(locale)
  const links = [
    { href: '/', label: tHook('nav.home') },
    { href: '/about', label: tHook('nav.about') },
    { href: '/projects', label: tHook('nav.projects') },
    { href: '/contact', label: tHook('nav.contact') },
  ]
  const switchLocale = (next: string) => {
    if (next === locale) return
    // Remove existing locale segment if present
    const rest = supported.includes(possibleLocale) ? '/' + segments.slice(1).join('/') : pathname
    const target = next === 'en' ? (rest === '/' ? '/' : rest) : `/${next}${rest === '/' ? '' : rest}`
    router.push(target)
  }
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur bg-background/70 border-b">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold">
          Filip Herceg
        </Link>
        <nav className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList>
              {links.map(l => (
                <NavigationMenuItem key={l.href}>
                  <NavigationMenuLink asChild className="px-3 py-2 text-sm hover:underline">
                    <Link href={withLocale(l.href)}>{l.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 text-xs border rounded px-2 py-1">
            <button aria-label="English" className={locale==='en'? 'font-semibold underline' : ''} onClick={()=>switchLocale('en')}>{tHook('lang.english')}</button>
            <span className="opacity-40">/</span>
            <button aria-label="Deutsch" className={locale==='de'? 'font-semibold underline' : ''} onClick={()=>switchLocale('de')}>{tHook('lang.german')}</button>
          </div>
          <MotionToggle />
          <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden px-3 py-2 text-sm border rounded">Menu</SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-4 pt-10">
            {links.map((l) => (
              <Link key={l.href} href={withLocale(l.href)} onClick={() => setOpen(false)} className="text-lg">
                {l.label}
              </Link>
            ))}
          </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
