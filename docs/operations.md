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

- Add Prometheus sidecar or OpenTelemetry exporter (future)
- Lighthouse scores trend (CI history)
- Future custom metrics:
  - Cache hit ratio for CV aggregate service
  - DB load latency (histogram)
  - Fallback count (counter)
  - (Planned) Per-locale request distribution & missing translation key counts

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

## Internationalization Ops Notes

- Current hreflang strategy is dynamic DOM insertion; static pre-rendered alternates & sitemap localization still pending. Expect search engines to pick up alternates but completeness improves after sitemap feature lands.
- Adding a new locale requires: update `next.config.mjs`, add message catalog JSON, extend tests, and (later) add locale-specific DB content.
