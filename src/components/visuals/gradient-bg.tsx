"use client"
import React from 'react'
import { motion } from 'framer-motion'
import { transitions } from '@/lib/motion'

type Props = {
  className?: string
}

export default function GradientBG({ className }: Props) {
  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${className || ''}`} aria-hidden>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transitions.base()}
        className="pointer-events-none"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(40% 40% at 20% 20%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(50% 50% at 80% 30%, rgba(236,72,153,0.25), transparent 60%)',
          filter: 'blur(40px)'
        }}
      />
    </div>
  )
}
