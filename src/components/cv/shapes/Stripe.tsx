import React from 'react'

export interface ShapeBaseProps {
  className?: string
  accent?: string
  opacity?: number
  seed?: number
}

const Stripe: React.FC<ShapeBaseProps> = ({ className, accent = 'currentColor', opacity = 0.08 }) => (
  <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
    <defs>
      <pattern id="cv-stripes" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="2" height="4" fill={accent} />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#cv-stripes)" opacity={opacity} />
  </svg>
)

export default Stripe
