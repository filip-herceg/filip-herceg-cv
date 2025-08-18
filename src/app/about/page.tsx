import { Section } from '@/components/ui/section'

export const metadata = { title: 'About – Filip Herceg' }

export default function AboutPage() {
  const skills = ['TypeScript', 'React', 'Next.js', 'Node.js', 'Kubernetes', 'CI/CD']
  return (
    <main>
      <Section className="pt-24">
        <h1 className="text-3xl font-bold mb-4">About</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          I am a software engineer focused on building robust, scalable front-end platforms and
          tooling that improve developer velocity and product quality.
        </p>
        <h2 className="mt-8 font-semibold">Skills</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((s) => (
            <span key={s} className="text-xs rounded bg-muted px-2 py-1">
              {s}
            </span>
          ))}
        </div>
        <h2 className="mt-10 font-semibold">Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Timeline placeholder – add roles & milestones.
        </p>
      </Section>
    </main>
  )
}
