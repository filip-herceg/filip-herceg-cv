import React from 'react'
import type { ShapeBaseProps } from './Stripe'

// Lightweight pseudo-random blob using seeded control points
function generateBlobPath(seed = 1, radius = 48): string {
  const points = 8
  const rand = (n: number) => {
    const x = Math.sin(seed + n * 9973) * 43758.5453
    return x - Math.floor(x)
  }
  const angleStep = (Math.PI * 2) / points
  const coords = Array.from({ length: points }).map((_, i) => {
    const angle = i * angleStep
    const r = radius * (0.75 + rand(i) * 0.5)
    const x = 50 + Math.cos(angle) * r * 0.02 * 100
    const y = 50 + Math.sin(angle) * r * 0.02 * 100
    return [x, y]
  })
  let d = ''
  coords.forEach(([x, y], i) => {
    if (i === 0) d += `M ${x.toFixed(2)} ${y.toFixed(2)}`
    else {
      const [px, py] = coords[i - 1]
      const cx = (px + x) / 2
      const cy = (py + y) / 2
      d += ` Q ${px.toFixed(2)} ${py.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)}`
    }
  })
  d += ' Z'
  return d
}

const Blob: React.FC<ShapeBaseProps> = ({ className, accent = 'currentColor', opacity = 0.08, seed = 1 }) => {
  const d = generateBlobPath(seed)
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill={accent} opacity={opacity} />
    </svg>
  )
}

export default Blob
