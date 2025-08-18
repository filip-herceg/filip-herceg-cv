export const dynamic = 'error'
import { Section } from '@/components/ui/section'
import PresetProjects from '@/components/visuals/preset-projects'

export const metadata = { title: 'Projects – Filip Herceg' }

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
