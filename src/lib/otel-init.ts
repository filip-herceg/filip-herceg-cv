// OpenTelemetry bootstrap (Phase 3 scaffold)
// Conditionally initializes OTEL when ENABLE_TRACING=1 and an exporter endpoint is provided.
// File recreated (renamed from otel.ts) to clear prior phantom lint warning cache.

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

let initialized = false

export async function initOpenTelemetry(): Promise<void> {
  if (initialized) return
  if (process.env.ENABLE_TRACING !== '1') return
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!endpoint) return

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'filip-herceg-cv',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version,
    environment: process.env.NODE_ENV || 'development',
  })
  const provider = new NodeTracerProvider({ resource })
  try {
    const exporter = new OTLPTraceExporter({ url: endpoint })
    provider.addSpanProcessor(new BatchSpanProcessor(exporter))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OTEL exporter init failed', err)
  }
  provider.register()
  initialized = true
}

// Helper to be invoked in server startup contexts (e.g., custom script or first request pathway)
export async function ensureTelemetry(): Promise<void> {
  try { await initOpenTelemetry() } catch { /* ignore */ }
}
