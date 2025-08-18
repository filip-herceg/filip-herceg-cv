"use client"
import { useEffect } from 'react'
import { onCLS, onINP, onLCP } from 'web-vitals/attribution'

function send(metric: { name: string; value: number; id?: string; rating?: string; navigationType?: string }) {
  const body = JSON.stringify(metric)
  const url = '/api/rum'
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body)
  } else {
    fetch(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body })
  }
}

export function Vitals() {
  useEffect(() => {
    onCLS(send)
    onINP(send)
    onLCP(send)
  }, [])
  return null
}

export default Vitals
