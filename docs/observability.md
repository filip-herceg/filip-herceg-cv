> This document moved. New canonical path: `docs/architecture/observability.md`.

# Observability & Metrics (Moved)

Content consolidated & expanded at new location. This stub will be removed after link audit.
* Enable ServiceMonitor (Prometheus Operator): `metrics.serviceMonitor.enabled=true` (renders ServiceMonitor CRD if operator installed)
* Customize interval / timeout: `metrics.serviceMonitor.interval`, `metrics.scrapeTimeout`
* Enable bundled Grafana dashboard ConfigMap: `metrics.grafanaDashboard.enabled=true` (labeled for sidecar import). Folder annotation via `metrics.grafanaDashboard.folder`.

ServiceMonitor test (F05) will assert rendered `ServiceMonitor` YAML when both flags true.

Grafana dashboard (F06) now included (ConfigMap). Panels:
* PDF request rate by result (5m rate)
* Cache size (gauge/stat) & hit ratio (expression)
* Permalink create rate
* CV aggregate loads by source (empty vs db) – helps verify onboarding placeholder usage shrinks after initial admin population

## 4. Extension Guidelines
When adding a new metric:
1. Prefer counters for monotonically increasing events (errors, requests). Gauges for values that go up/down (cache size). Histograms for latency distributions (future if needed: PDF generation duration buckets).
2. Keep label cardinality low; avoid user-specific labels (privacy + memory safety).
3. Add a test asserting the metric name appears in `/api/metrics` output (maintains coverage & prevents accidental removal).
4. Update this document & the roadmap acceptance criteria.
5. If the metric introduces a new label, ensure label cardinality is tightly bounded (e.g., `source` has only `empty|db`).

### Onboarding Placeholder (`source="empty"`)
Until an admin populates CV content, the service returns a deterministic onboarding aggregate (placeholder person name, empty arrays) and records `cv_aggregate_loads_total{source="empty"}`. Once real records exist and validate, loads emit `{source="db"}`. A sudden reappearance of `empty` in production after being `db` previously can signal data regression or validation failure.

## 5. Testing Strategy
* Unit: `metrics.ts` imported and snapshot / string contains expectations.
* Integration: `/api/metrics` route checked for `pdf_requests_total`, `permalink_creates_total`, `pdf_cache_entries` lines and correct content-type & no-store cache header.
* Future: add cache hit/miss counters tests once cache implemented.

## 6. Tracing (Planned Scaffold – S07 / F12)
Tracing will be introduced behind an env flag (`ENABLE_TRACING=1`). Initial spans:
* `pdf.generate` with attributes: `cv.selection.hash`, `result.status`, `duration_ms` (if histogram not yet in place)
* `cv.json.render` with `etag.changed` attribute

No vendor lock-in: use OpenTelemetry SDK exporting to OTLP endpoint (configurable). Documentation will expand here once implemented.

## 7. Logging Conventions (Reference)
Structured logs (Pino) include: `requestId`, `path`, `method`, domain events (`domain:*`), and outcome fields (`etag`, `publicMode`, etc.). Avoid embedding PII; redact or omit email addresses except where explicitly permitted.

## 8. Operational Checks
| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Endpoint health | GET `/api/metrics` | 200, non-empty body, contains known metric names |
| Error ratio | PromQL: `sum(rate(pdf_requests_total{status!="success"}[5m])) / sum(rate(pdf_requests_total[5m]))` | < 0.01 sustained |
| Cache growth | `max_over_time(pdf_cache_entries[6h])` | Plateau below configured limit |
| Unsupported PDF detection | `increase(pdf_requests_total{status="unsupported"}[1h])` | Should remain 0 in production cluster |

---
Maintained alongside roadmap updates. Update when adding/removing metrics.
