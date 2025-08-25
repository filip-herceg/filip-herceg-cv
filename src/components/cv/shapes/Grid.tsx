import React from 'react'
import type { ShapeBaseProps } from './Stripe'

const Grid: React.FC<ShapeBaseProps> = ({ className, accent = 'currentColor', opacity = 0.06 }) => (
  <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
    <defs>
      <pattern id="cv-grid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke={accent} strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#cv-grid)" opacity={opacity} />
  </svg>
)

export default Grid
