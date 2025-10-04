import React from 'react'
import { Section } from '@/components/ui/section'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import GradientBG from '@/components/visuals/gradient-bg'
import { localizedMeta, localeFromHeaders, t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = localeFromHeaders()
  return localizedMeta(locale, 'home')
}
export const dynamic = 'error' // ensure full static generation

export default function HomePage() {
  const locale = 'en' // default; runtime client hints not available server-side here
  const heading = t(locale, 'home.hero.heading')
  const sub = t(locale, 'home.hero.sub')
  const emailCta = t(locale, 'home.hero.email')
  const featured = t(locale, 'home.featured')
  const allProjects = t(locale, 'home.projects.all')
  const projects = [
    {
      title: t(locale, 'home.project.portfolio.title'),
      description: t(locale, 'home.project.portfolio.desc'),
      tags: ['Next.js', 'K8s'],
    },
    {
      title: t(locale, 'home.project.tooling.title'),
      description: t(locale, 'home.project.tooling.desc'),
      tags: ['CI', t(locale, 'tag.tooling')],
    },
    {
      title: t(locale, 'home.project.motion.title'),
      description: t(locale, 'home.project.motion.desc'),
      tags: [t(locale, 'tag.motion'), t(locale, 'tag.library')],
    },
  ]
  return (
    <main>
      <Section className="pt-24 relative">
        <GradientBG />
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{heading}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{sub}</p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link href="mailto:me@example.com">{emailCta}</Link>
            </Button>
          </div>
        </div>
      </Section>
      <Section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">{featured}</h2>
          <Button asChild variant="ghost" className="gap-1">
            <Link href="/projects">
              {allProjects} <ArrowRight size={16} />
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
