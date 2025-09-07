---
title: Deploy workflow (Helm-first)
status: draft
---

Source of truth: `helm/` chart. If you keep `k8s/base/` in repo, treat it as generated output for readability only.

Regenerate manifests locally:
1. Ensure Helm available (or use Dockerized task in VS Code).
2. Render templates for your values file:
   - VS Code task: "Helm: template (auto)"
   - Or manually: `helm template cv ./helm --values ./helm/values.yaml > k8s/base/all.yaml`

Notes:
- Do not edit `k8s/base/` by hand; changes will be overwritten.
- Prefer deploying with Helm to preserve release history and values diffs.
