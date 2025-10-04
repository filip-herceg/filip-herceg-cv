import React, { ReactNode } from 'react'

type SectionProps = Readonly<{ children: ReactNode; className?: string }>

export function Section({ children, className = '' }: SectionProps) {
  return (
    <section className={`py-12 md:py-20 ${className}`}>
      <div className="container">{children}</div>
    </section>
  )
}
