"use client"
import { motion } from 'framer-motion'
import { transitions } from '@/lib/motion'

type Props = {
  children: React.ReactNode
  delayStep?: number
  className?: string
}

export default function Stagger({ children, delayStep = 0.08, className }: Props) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={transitions.base(i * delayStep)}>
          {child}
        </motion.div>
      ))}
    </div>
  )
}
