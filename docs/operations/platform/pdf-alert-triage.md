# PDF Alerts – Triage Guide

This guide helps you diagnose and fix common PDF export alerts.

Alerts
- CVChromiumPoolHighUtilization
  - Meaning: busy/total > 80% sustained.
  - Check: Grafana “Pool Utilization”, “Acquire p95”, pod replica count.
  - Remediate: increase replicas or PDF_CHROMIUM_POOL_SIZE; verify pages release to about:blank; ensure CHROMIUM_PATH valid.
- CVPdfExportFailureRatioHigh
  - Meaning: error+timeout ratio > 1% over 15m.
  - Check: /api/metrics counters, recent deploys, logs for domain:cv.pdf.* events.
  - Remediate: confirm Chromium availability, timeouts, network egress; roll back recent changes if needed.
- CVPdfP95DurationHigh
  - Meaning: p95 generation time above threshold (default 2.5s).
  - Check: utilization, acquire duration, pod CPU throttling, HPA events.
  - Remediate: scale up/down, tune pool size, revisit heavy assets or CSS for print.
 - CVChromiumAcquireP95High
   - Meaning: p95 time to acquire a page from the pool is high; contention or stuck pages.
   - Check: pool utilization, busy vs total, recent deploys affecting release flow, logs around acquire/release.
   - Remediate: increase pool size or replicas; ensure release resets to about:blank; investigate long-lived pages.

Runbook checklist
- Is metrics endpoint up? curl service /metrics.
- Is CHROMIUM_PATH present on pods (describe env) or baked into image?
- Any pod restarts or OOM kills?
- Can /api/cv/pdf succeed against one pod (port-forward)?

Notes
- Headless RUM requests are aborted during PDF; navigation waitUntil=load to avoid idle flakiness.
- Keep pool prime enabled for consistent warm times.