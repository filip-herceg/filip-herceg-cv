export const dynamic = 'error'
import { Section } from '@/components/ui/section'
import PresetProjects from '@/components/visuals/preset-projects'
import { localizedMeta, localeFromHeaders, t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = localeFromHeaders()
  return localizedMeta(locale, 'projects', { path: 'projects' })
}

const projectData = [
  {
    title: 'Portfolio Platform',
    desc: 'This site – containerized Next.js with K8s & Helm.',
    tags: ['Next.js', 'K8s'],
  },
  {
    title: 'Dev Tooling Suite',
    desc: 'Automation scripts improving DX and release speed.',
    tags: ['CI', 'Tooling'],
  },
  {
    title: 'UI Motion Library',
    desc: 'Reusable animation primitives for product teams.',
    tags: ['Framer Motion', 'Library'],
  },
]

export default function ProjectsPage() {
  const locale = 'en'
  const heading = t(locale, 'projects.heading')
  return (
    <main>
      <Section className="pt-24">
  <h1 className="text-3xl font-bold mb-6">{heading}</h1>
  <PresetProjects projects={projectData} />
      </Section>
    </main>
  )
}
