"use client"
import { useEffect, useState } from 'react'

const CHARS = '!<>-_\/[]{}—=+*^?#________'

type Props = {
  text: string
  className?: string
  speed?: number
}

export default function TextScramble({ text, className, speed = 30 }: Props) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    let frame = 0
    const queue = Array.from({ length: text.length }, (_, i) => ({
      to: text[i],
      start: Math.floor(Math.random() * 20),
      end: Math.floor(Math.random() * 20) + 20,
    }))
    let timer: number | undefined
    const update = () => {
      let output = ''
      let complete = 0
      queue.forEach((q) => {
        if (frame >= q.end) { complete++; output += q.to; }
        else if (frame >= q.start) output += CHARS[Math.floor(Math.random() * CHARS.length)]
        else output += ' '
      })
      setDisplay(output)
      frame++
      if (complete < queue.length) timer = window.setTimeout(update, speed)
    }
    update()
    return () => { if (timer) window.clearTimeout(timer) }
  }, [text, speed])

  return (
    <span className={className} aria-label={text} role="text">
      {display}
    </span>
  )
}
