export const dynamic = 'error'
import { Section } from '@/components/ui/section'
import PresetProjects from '@/components/visuals/preset-projects'
import { localizedMeta } from '@/lib/i18n'
import { headers } from 'next/headers'

export async function generateMetadata() {
  const h = headers()
  const path = h.get('x-pathname') || ''
  const seg = path.split('/').filter(Boolean)[0]
  const locale = ['de'].includes(seg) ? seg : 'en'
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
  return (
    <main>
      <Section className="pt-24">
  <h1 className="text-3xl font-bold mb-6">Projects</h1>
  <PresetProjects projects={projectData} />
      </Section>
    </main>
  )
}
