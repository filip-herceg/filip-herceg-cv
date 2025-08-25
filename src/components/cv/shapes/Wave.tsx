import React from 'react'
import type { ShapeBaseProps } from './Stripe'

// Simple parametric wave path; seed influences amplitude/phase in a deterministic lightweight way
const Wave: React.FC<ShapeBaseProps> = ({ className, accent = 'currentColor', opacity = 0.08, seed = 1 }) => {
  const amp = 6 + (seed % 5)
  const phase = (seed % 10) / 10
  const d = Array.from({ length: 12 }).map((_, i) => {
    const x = (i / 11) * 100
    const y = 50 + Math.sin((i + phase) * 0.9) * amp
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  })
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path d={d.join(' ')} fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" opacity={opacity} />
    </svg>
  )
}

export default Wave
