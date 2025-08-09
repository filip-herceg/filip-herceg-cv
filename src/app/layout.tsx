import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/layout/site-header'

export const metadata: Metadata = {
  title: 'Filip Herceg – Portfolio',
  description: 'Personal portfolio of Filip Herceg: projects, experience, contact.',
  openGraph: {
    title: 'Filip Herceg – Portfolio',
    description: 'Projects, experience, and contact information.',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Filip Herceg Portfolio'
      }
    ]
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
