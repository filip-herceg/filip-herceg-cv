'use client'
import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
export function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className={`py-12 md:py-20 ${className}`}
    >
      <div className="container">{children}</div>
    </motion.section>
  )
}
