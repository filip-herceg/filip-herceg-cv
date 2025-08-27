import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/layout/site-header'
import ErrorBoundary from '@/components/layout/error-boundary'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
import Vitals from '@/components/layout/vitals'
import { LocaleHead } from '@/components/layout/locale-head'
import { localeFromHeaders } from '@/lib/i18n'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: 'Filip Herceg – Portfolio',
  description: 'Personal portfolio of Filip Herceg: projects, experience, contact.',
  openGraph: {
    title: 'Filip Herceg – Portfolio',
    description: 'Projects, experience, and contact information.',
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Filip Herceg Portfolio',
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = localeFromHeaders()
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        url: siteUrl,
        name: 'Filip Herceg – Portfolio',
        inLanguage: locale,
      },
      {
        '@type': 'Person',
        name: 'Filip Herceg',
        url: siteUrl,
        jobTitle: 'Software Engineer',
        sameAs: ['https://github.com/filip-herceg'],
      },
    ],
  }
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen font-sans antialiased`}>
        <LocaleHead />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SiteHeader />
        <ErrorBoundary>
          {children}
          <Vitals />
        </ErrorBoundary>
      </body>
    </html>
  )
}
