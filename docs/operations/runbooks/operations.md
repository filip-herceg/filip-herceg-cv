---
title: Operations Runbook
category: operations
status: active
lastUpdated: 2025-09-02
canonical: docs/operations/operations.md
---
<!-- Source: formerly docs/operations.md -->
# Operations Runbook

## Health

- Liveness/readiness: HTTP 200 on `/api/healthz`
- External uptime check recommended

Additional soft health indicators (log-derived):
- `cv-service` warnings about parse failures indicate DB data inconsistency; app still serves static fallback.
- Elevated fallback rate suggests migration or seeding issues.
- Locale head injection issues (missing `<link hreflang>` in prod) can degrade SEO; verify by inspecting rendered HTML for representative pages in each locale.

## Logs

- App logs to stdout
- Aggregate via cluster logging (e.g., Loki, ELK, Cloud provider)
- `cv-service` logger emits:
	- `cv data parse failed from db` / `cv design parse failed from db` (warn) when Zod validation fails.
	- `db load failed; falling back to static` (warn) on query errors.

## Metrics

Current exposed via `/api/metrics` (Prometheus exposition format):

- `auth_login_attempts_total{result="success|failure"}`
- `auth_active_sessions` (Gauge)
- `auth_rate_limiter_backend{backend="memory|redis"}` (Gauge always set to 1 for active backend)
- `auth_login_backoff_ms` (Gauge ΓÇô last applied backoff delay)
- `auth_rate_limit_failures_total` (Counter ΓÇô failed credential attempts triggering backoff)
- CV aggregation counters (source classification) if implemented (see service layer)
- RUM vitals aggregated stats

Planned additions:

- Cache hit ratio & load latency histogram
- DB parse / static fallback counter (cv)
- Per-locale request distribution & missing translation key counts
- PDF generation duration & failure counters

## Scaling

- Observe CPU usage; tune HPA target
- Consider memory-based HPA or custom metrics

## Deployments

- Helm upgrade (recorded in history)
- Rollback via `helm rollback`

## Secrets Rotation

1. Update secret via `kubectl apply` or `helm upgrade`
2. Restart pods (rolling) if not auto-detected

### Email Provider (Contact Form)

Required environment variables for outbound email via Resend:

- `CONTACT_PROVIDER_API_KEY`
- `CONTACT_FROM_ADDRESS`
- `CONTACT_TO_ADDRESS`
	If any are missing the API returns 503 with `accepted: false` and logs `contact.send.fallback`.
	Store them in Kubernetes Secret and surface via Helm values -> env.

## Incident Checklist

1. Confirm ingress / DNS resolves
2. Check pod status: `kubectl get pods -n portfolio`
3. Describe failing pod: `kubectl describe pod/<name>`
4. View logs: `kubectl logs -f <pod> -n portfolio`
5. If image pull issues: verify registry creds & tag
6. Rollback if regression linked to deploy
7. If SEO/i18n regression suspected: fetch `/` and `/de` HTML, confirm `<html lang>` and `hreflang` links.

## Backups / DR (Future)

- Static site assets rebuildable from source
- Consider off-site backup for contact submissions if persisted later
- When Postgres introduced: enable automated snapshots & point-in-time recovery.

## Security Hardening (Future)

- Add PodSecurity / SecComp profiles
- Read-only root filesystem
- NetworkPolicies
- Image scanning in CI
 - Restrict DB network access (if moving off-pod) via NetworkPolicy / security groups.
 - CSP / security headers middleware (pending)
- Redis-backed rate limiter + session store (enables consistent backoff across replicas) ΓÇô Redis limiter implemented (enable via REDIS_URL); session store still Prisma-backed
 - MFA / TOTP for admin auth once write endpoints exist

## Auth Operations Notes

- Session TTL & sliding renewal: Renew occurs when remaining lifetime < configured fraction (0.5). Monitor `auth_active_sessions` after scaling events to detect orphaned sessions (consider TTL sweep job when moving to external store).
- Password change triggers session id rotation; all existing session cookies invalidated (mitigates fixation). Ensure load balancer cookie affinity is not required.
-- Rate limiting: Exponential backoff on failed admin logins; defaults to in-memory per pod. Set `REDIS_URL` to enable distributed `RedisRateLimiter`. A `FallbackRateLimiter` wrapper automatically degrades to memory on first Redis error (logged once with `auth.rate_limiter.redis_error` then `auth.rate_limiter.fallback_activated`). Backoff includes optional jitter (┬▒ fraction) via `AUTH_BACKOFF_JITTER_FRACTION` to reduce thundering herd alignment.

## Runtime Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| DATABASE_URL | Prisma database URL (Postgres recommended in prod) | (unset -> SQLite file) |
| REDIS_URL | Enables RedisRateLimiter for distributed login throttling | unset |
| ADMIN_BOOTSTRAP_USERNAME | Initial admin user if none exist | admin |
| ADMIN_BOOTSTRAP_PASSWORD | Initial admin password | unset |
| AUTH_SESSION_TTL_MS | Session lifetime milliseconds | 43200000 |
| AUTH_SESSION_RENEW_FRACTION | Sliding renewal threshold fraction | 0.5 |
| AUTH_BACKOFF_BASE_MS | Base backoff for failed logins | 250 |
| AUTH_BACKOFF_MAX_MS | Max backoff cap | 2000 |
| AUTH_BACKOFF_JITTER_FRACTION | Jitter fraction (0.25 = ┬▒25%) | 0 |
| AUTH_RATE_LIMIT_TTL_SECONDS | Failure window / sliding TTL seconds | 600 |
| SENTRY_* | Observability (tracing, replays) | varies |

Helm: set values under `env:` in `values.yaml`; the Secret template lowercases keys.

## Production Readiness Quick Audit

| Area | Status | Action |
|------|--------|--------|
| Health Endpoint | Ready | None |
| Auth Basic Security | Ready (hashing, renewal, rotation) | Add MFA later |
| Metrics | Ready (auth + base) | Add latency / cache metrics |
| Logging | Structured JSON | Forward to central store |
| DB | SQLite (dev-grade) | Migrate to Postgres for HA |
| Rate Limiting | In-memory | External store (Redis) |
| Secrets Mgmt | Kubernetes Secret | Add rotation SOP |
| CI Gates | Lint/Type/Test/Coverage/LHCI | Add SBOM & image signing |
| PDF Generation | Graceful 501 fallback | Add queue + timeout metrics |
| i18n | Path-based + metadata | Localize persisted CV data |

## Internationalization Ops Notes

- Current hreflang strategy is dynamic DOM insertion; static pre-rendered alternates & sitemap localization still pending. Expect search engines to pick up alternates but completeness improves after sitemap feature lands.
- Adding a new locale requires: update `next.config.mjs`, add message catalog JSON, extend tests, and (later) add locale-specific DB content.
