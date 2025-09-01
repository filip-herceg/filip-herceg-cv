import React from 'react'
import type { ShapeBaseProps } from './Stripe'

const Grid: React.FC<ShapeBaseProps> = ({ className, accent = 'currentColor', opacity = 0.06, seed: _seed }) => {
  // Use deterministic id when seed provided so tests can assert pattern existence.
  // Use stable id for tests and referencing; if multiple grids appear, reuse pattern definition safely.
  const patternId = 'cv-grid'
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke={accent} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#${patternId})`} opacity={opacity} />
    </svg>
  )
}

export default Grid
