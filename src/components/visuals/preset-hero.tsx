"use client"
import GradientBG from './gradient-bg'
import FadeInOnView from './fade-in-on-view'

type Props = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  cta?: React.ReactNode
  className?: string
}

export default function PresetHero({ title, subtitle, cta, className }: Props) {
  return (
    <section className={`relative py-24 ${className || ''}`}>
      <GradientBG />
      <div className="container max-w-3xl text-center">
        <FadeInOnView>
          <div className="text-4xl md:text-5xl font-bold tracking-tight">{title}</div>
        </FadeInOnView>
        {subtitle && (
          <FadeInOnView delay={0.08}>
            <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
          </FadeInOnView>
        )}
        {cta && (
          <FadeInOnView delay={0.16}>
            <div className="mt-6 flex justify-center">{cta}</div>
          </FadeInOnView>
        )}
      </div>
    </section>
  )
}
