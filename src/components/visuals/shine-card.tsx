"use client"
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useRef } from 'react'

type Props = {
  children: React.ReactNode
  className?: string
}

export default function ShineCard({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [0, 1], [8, -8])
  const rotateY = useTransform(x, [0, 1], [-8, 8])

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect()
        if (!rect) return
        const px = (e.clientX - rect.left) / rect.width
        const py = (e.clientY - rect.top) / rect.height
        x.set(px)
        y.set(py)
      }}
      onMouseLeave={() => {
        x.set(0.5)
        y.set(0.5)
      }}
      style={{ perspective: 600 }}
    >
      <motion.div style={{ rotateX, rotateY }} className="relative will-change-transform rounded-xl border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(255,255,255,0.2), transparent 40%)' }} />
        {children}
      </motion.div>
    </motion.div>
  )
}
