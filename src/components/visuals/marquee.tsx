"use client"
import { motion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'

type Props = {
  children: React.ReactNode
  speed?: number // px/s
  reverse?: boolean
  className?: string
}

export default function Marquee({ children, speed = 80, reverse = false, className }: Props) {
  const controls = useAnimationControls()
  useEffect(() => {
    const distance = 1000 // arbitrary large loop; content is repeated
    const duration = distance / speed
    controls.start({ x: reverse ? distance : -distance, transition: { duration, ease: 'linear', repeat: Infinity } })
  }, [controls, speed, reverse])

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className || ''}`}>
      <motion.div animate={controls} className="inline-flex gap-8">
        {children}
        {children}
        {children}
      </motion.div>
    </div>
  )
}
