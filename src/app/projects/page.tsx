export const dynamic = 'error'
import { Section } from '@/components/ui/section'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

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
        <div className="grid gap-6 md:grid-cols-3">
          {projectData.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{p.desc}</p>
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
