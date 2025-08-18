"use client"
import Stagger from '@/components/visuals/stagger'
import ShineCard from '@/components/visuals/shine-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export type Project = { title: string; desc: string; tags: string[] }

type Props = {
  projects: Project[]
}

export default function PresetProjects({ projects }: Props) {
  return (
    <Stagger className="grid gap-6 md:grid-cols-3">
      {projects.map((p) => (
        <ShineCard key={p.title} className="bg-background">
          <Card>
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
        </ShineCard>
      ))}
    </Stagger>
  )
}
