import React from 'react'
import { Section } from '@/components/ui/section'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata = { title: 'Filip Herceg – Software Engineer' }
export const dynamic = 'error' // ensure full static generation

export default function HomePage() {
  const projects = [
    {
      title: 'Portfolio Platform',
      description: 'This site – containerized Next.js with K8s & Helm.',
      tags: ['Next.js', 'K8s'],
    },
    {
      title: 'Dev Tooling Suite',
      description: 'Automation scripts improving DX and release speed.',
      tags: ['CI', 'Tooling'],
    },
    {
      title: 'UI Motion Library',
      description: 'Reusable animation primitives for product teams.',
      tags: ['Framer Motion', 'Library'],
    },
  ]
  return (
    <main>
      <Section className="pt-24">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Hi, I&apos;m Filip Herceg.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            I build performant web platforms and delightful developer experiences.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link href="mailto:me@example.com">Email Me</Link>
            </Button>
          </div>
        </div>
      </Section>
      <Section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Featured Projects</h2>
          <Button asChild variant="ghost" className="gap-1">
            <Link href="/projects">
              All Projects <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="text-xs rounded bg-muted px-2 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  )
}
