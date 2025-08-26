# Task 7: Logging & Privacy Enhancements

Status: Task 7 of 7 (Schema ✅ · Taxonomy ✅ · Search ✅ · Permalink ✅ · Export Matrix ✅ · Perf/A11y Budgets ✅ · Logging & Privacy ⏳)

## Objectives
Provide structured, privacy-aware logging with:
- Request correlation (request id) + minimal client fingerprint (UA family only).
- PII scrubbing (emails, potential secrets) before log emission.
- Log event taxonomy (prefix domain:contact, domain:cv, infra:http, perf:rum).
- Privacy level toggle via env (LOG_PRIVACY=high redacts more fields).
- Safe error serialization (no stack traces leaked in `public` mode response bodies, still logged internally).

## Proposed Additions
| Feature | Implementation | Notes |
|---------|----------------|-------|
| Correlation ID | Middleware generates `x-request-id` (uuid v4) if absent | Exposed to handlers via header |
| Logger child helper | `withRequestContext(req)` returns child with id, path, method | Replaces generic `withRequest` |
| PII Scrubber | Small function replacing email patterns & long hex tokens with `[redacted]` | Applied to object shallow clone before logging |
| Privacy Levels | `low` (default) only scrubs obvious sensitive fields; `high` also scrubs all emails, domains from URLs | Env driven |
| Structured Error Helper | `logError(logger, err, event)` extracts safe subset (name,message) and attaches hash of stack | Avoids dumping sensitive stack lines |
| RUM Aggregation Logging | (Done) stats route emits `perf:rum.stats` with metric count | Could add sampling later |

## Schema (Event Field Conventions)
| Field | Type | Description |
|-------|------|-------------|
| event | string | Namespaced identifier (`domain:action.outcome`) |
| requestId | string | Correlates logs for a request |
| path | string | Request pathname |
| method | string | HTTP method |
| privacy | string | Active privacy level |
| redactions | string[] | Fields removed / masked |

## Acceptance Criteria
- New middleware adds `x-request-id` and CSP nonce remains unaffected. ✅
- Contact route logs include requestId and no raw email when LOG_PRIVACY=high. ✅ (scrubber + test)
- CV export & PDF routes emit namespaced success / error / cache events. ✅
- RUM metric & stats endpoints emit `perf:rum.metric` & `perf:rum.stats`. ✅
- Unit tests assert scrubbing, high privacy URL host masking, error helper. ✅
- Coverage stays >=80% branches. ✅

## Follow-ups (Optional)
- Ship logs to external sink (e.g., OpenTelemetry exporter) – out of scope.
- Add dynamic sampling for high-volume routes.

Status: In Progress – core logging implemented; optional sampling / external shipping deferred.
