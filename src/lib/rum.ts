type Metric = { name: string; value: number; rating?: string }

// In-memory RUM metric aggregator (per-instance, ephemeral). Suitable for demo/dev.
const buf: Record<string, number[]> = {}

export function record(metric: Metric) {
  const key = metric.name.toLowerCase()
  buf[key] = buf[key] || []
  buf[key].push(metric.value)
  // cap array to avoid unbounded growth
  if (buf[key].length > 1000) buf[key].splice(0, buf[key].length - 1000)
}

export function stats() {
  const out: Record<string, { p50: number; p90: number; p99: number; count: number }> = {}
  for (const [k, arr] of Object.entries(buf)) {
    const sorted = [...arr].sort((a, b) => a - b)
    const n = sorted.length
    const q = (p: number) => sorted[Math.min(n - 1, Math.floor((p / 100) * (n - 1)))]
    out[k] = { p50: q(50), p90: q(90), p99: q(99), count: n }
  }
  return out
}

export function clear() {
  for (const k of Object.keys(buf)) delete buf[k]
}
