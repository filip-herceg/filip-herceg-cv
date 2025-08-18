# Operations Runbook

## Health

- Liveness/readiness: HTTP 200 on `/api/healthz`
- External uptime check recommended

## Logs

- App logs to stdout
- Aggregate via cluster logging (e.g., Loki, ELK, Cloud provider)

## Metrics

- Add Prometheus sidecar or OpenTelemetry exporter (future)
- Lighthouse scores trend (CI history)

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

## Backups / DR (Future)

- Static site assets rebuildable from source
- Consider off-site backup for contact submissions if persisted later

## Security Hardening (Future)

- Add PodSecurity / SecComp profiles
- Read-only root filesystem
- NetworkPolicies
- Image scanning in CI
