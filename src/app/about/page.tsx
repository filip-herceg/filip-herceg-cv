export const dynamic = 'error'
import { Section } from '@/components/ui/section'

import { localizedMeta, localeFromHeaders, t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = localeFromHeaders()
  return localizedMeta(locale, 'about')
}

export default function AboutPage() {
  const locale = 'en'
  const heading = t(locale, 'about.heading')
  const body = t(locale, 'about.body')
  const skillsLabel = t(locale, 'about.skills')
  const timeline = t(locale, 'about.timeline')
  const timelinePlaceholder = t(locale, 'about.timeline.placeholder')
  const skills = ['TypeScript', 'React', 'Next.js', 'Node.js', 'Kubernetes', 'CI/CD']
  return (
    <main>
      <Section className="pt-24">
  <h1 className="text-3xl font-bold mb-4">{heading}</h1>
  <p className="text-muted-foreground leading-relaxed max-w-2xl">{body}</p>
  <h2 className="mt-8 font-semibold">{skillsLabel}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((s) => (
            <span key={s} className="text-xs rounded bg-muted px-2 py-1">
              {s}
            </span>
          ))}
        </div>
  <h2 className="mt-10 font-semibold">{timeline}</h2>
  <p className="text-sm text-muted-foreground">{timelinePlaceholder}</p>
      </Section>
    </main>
  )
}
