# Chromium PDF Pool – Operations Runbook

Purpose: Speed up PDF exports by reusing a warm headless Chromium page pool.

Key env vars:
- CHROMIUM_PATH: Absolute path to Chromium/Chrome/Edge executable.
- PDF_CHROMIUM_POOL_SIZE: Pool size (pages). Default 1.
- PDF_CHROMIUM_POOL_PRIME: "true" to best-effort warm at boot.

Local (Windows):
- Recommended: point CHROMIUM_PATH to Edge: `C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe`.
- Start prod-like: use task "Start: next start" (sets CV_STORAGE=memory, AUTO_SEED=false). For PDF benchmarks, use the dedicated "Start: prod (PDF bench)" task.

Prod guidance:
- Ensure a Chromium binary is present on the image (or set CHROMIUM_PATH explicitly).
- Keep pool size conservative (1–2) unless high parallelism is required and memory allows.

Metrics to watch:
- chromium_pool_enabled: 1 when binary resolved and browser launched.
- chromium_pool_pages_total / _busy: capacity vs in-use.
- chromium_acquire_duration_seconds: time to get a page (should be short on warm path).
 - Utilization (Grafana): busy / total gauge. Consider alerting when >80% for 5m.

Troubleshooting:
- 501 from /api/cv/pdf: likely no Chromium binary. Set CHROMIUM_PATH or bake one into the container/host.
- Timeouts: prefer waitUntil='load' for navigation in headless export; increase PDF_DEFAULT_TIMEOUT_MS or check target route health. Ensure RUM endpoints are aborted via request interception in headless to avoid idle blocking.
- Memory pressure: lower PDF_CHROMIUM_POOL_SIZE or disable prime (set PDF_CHROMIUM_POOL_PRIME=false).

Observed benchmarks (Windows, Edge): cold ~1.23s; warm p50 ~0.76s (8 iterations) with pool primed.
