"use client"
import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type Props = {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}

export default function FadeInOnView({ children, delay = 0.05, y = 12, className }: Props) {
  const prefersReducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (prefersReducedMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {/* Avoid hydration mismatch: only animate on client */}
      {mounted ? children : <div style={{ opacity: 0 }}>{children}</div>}
    </motion.div>
  )
}
