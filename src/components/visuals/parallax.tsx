"use client"
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

type Props = {
  children: React.ReactNode
  strength?: number // px range across scroll
  className?: string
}

export default function Parallax({ children, strength = 40, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength])
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
