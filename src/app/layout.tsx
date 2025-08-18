import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/layout/site-header'
import ErrorBoundary from '@/components/layout/error-boundary'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
import Vitals from '@/components/layout/vitals'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
  <body className={`${inter.className} min-h-screen font-sans antialiased`}>
        {/* JSON-LD Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: 'Filip Herceg',
              url: (process.env.SITE_URL || 'http://localhost:3000'),
              jobTitle: 'Software Engineer',
              sameAs: [
                'https://github.com/filip-herceg',
              ],
            }),
          }}
        />
        <SiteHeader />
        <ErrorBoundary>
          {children}
          <Vitals />
        </ErrorBoundary>
      </body>
    </html>
  )
}
