---
title: Deploy workflow (Helm-first)
status: draft
---

Source of truth: `helm/` chart. `k8s/base/` is committed only for readability and should be treated as generated output.

Regenerate manifests locally:
1. Ensure Helm available (or use Dockerized task in VS Code).
2. Render templates for your values file:
   - VS Code task: "Helm: template (auto)"
   - Or manually: `helm template cv ./helm --values ./helm/values.yaml > k8s/base/all.yaml`
   - Optional: run `helm lint ./helm` before templating and `kubeconform` against `k8s/base/all.yaml` in CI.

Notes:
- Do not edit `k8s/base/` by hand; changes will be overwritten.
- Prefer deploying with Helm to preserve release history and values diffs.
