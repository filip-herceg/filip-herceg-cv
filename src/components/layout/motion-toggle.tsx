"use client"
import React, { useEffect, useState } from 'react'

export default function MotionToggle() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('reduce-motion')
    if (stored === 'true') {
      document.documentElement.classList.add('reduce-motion')
      setReduced(true)
    }
  }, [])

  useEffect(() => {
    if (reduced) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
    localStorage.setItem('reduce-motion', String(reduced))
  }, [reduced])

  return (
    <button
      type="button"
      onClick={() => setReduced((v) => !v)}
      className="text-xs text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-2 rounded px-2 py-1"
      aria-pressed={reduced}
      title={reduced ? 'Enable motion' : 'Reduce motion'}
    >
      {reduced ? 'Enable motion' : 'Reduce motion'}
    </button>
  )
}
