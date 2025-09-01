import React from 'react'

export interface ShapeBaseProps {
  className?: string
  accent?: string
  opacity?: number
  /** Optional deterministic seed for generative shapes */
  seed?: number
}

const Stripe: React.FC<ShapeBaseProps> = ({ className, accent = 'currentColor', opacity = 0.08, seed }) => {
  const patternId = React.useId().replace(/:/g, '') + (seed != null ? `-${seed}` : '')
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="2" height="4" fill={accent} />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#${patternId})`} opacity={opacity} />
    </svg>
  )
}

export default Stripe
