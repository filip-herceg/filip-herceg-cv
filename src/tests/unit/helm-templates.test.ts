import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'

function helmAvailable() {
  try { execSync('helm version', { stdio: 'ignore' }); return true } catch { return false }
}

describe('Helm templating (observability artifacts)', () => {
  it('renders ServiceMonitor when enabled', () => {
    if (!helmAvailable()) return
    const output = execSync('helm template test ./helm --set metrics.enabled=true --set metrics.serviceMonitor.enabled=true', { encoding: 'utf8' })
    expect(output).toMatch(/kind: ServiceMonitor/) // CRD present
    expect(output).toMatch(/name: test-filip-herceg-cv/) // resource named with release prefix
  })

  it('renders Grafana dashboard ConfigMap when enabled', () => {
    if (!helmAvailable()) return
    const output = execSync('helm template dash ./helm --set metrics.enabled=true --set metrics.grafanaDashboard.enabled=true', { encoding: 'utf8' })
    expect(output).toMatch(/kind: ConfigMap/)
    expect(output).toMatch(/grafana-dashboard/) // name suffix
    expect(output).toMatch(/pdf_cache_hits_total/)
  expect(output).toMatch(/cv_aggregate_loads_total/)
  })
})
