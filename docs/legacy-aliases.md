---
title: Legacy Doc Aliases
status: informational
lastUpdated: 2025-09-03
canonical: docs/legacy-aliases.md
---
# Legacy Documentation Aliases

This file records removed flat documentation filenames and their canonical replacements after the Phase 2 reorganization. It helps avoid re‑introducing obsolete paths and serves as a reference for updating any external links.

| Removed Path | Canonical Path |
|--------------|----------------|
| docs/architecture.md | docs/architecture/architecture.md |
| docs/observability.md | docs/architecture/observability.md |
| docs/operations.md | docs/operations/operations.md |
| docs/cicd.md | docs/engineering/ci-cd.md |
| docs/permalink.md | docs/product/permalink.md |
| docs/engineering/cicd.md | docs/engineering/ci-cd.md |
| docs/development.md | docs/engineering/development.md |
| docs/admin.md | docs/engineering/admin.md |
| docs/persistence.md | docs/architecture/persistence.md |
| docs/kubernetes.md | docs/operations/kubernetes.md |
| docs/i18n-seo-phase2.md | docs/product/i18n-seo-phase2.md |
| docs/vision-mission.md | docs/product/vision-mission.md |
| docs/taxonomy.md | docs/product/taxonomy.md |
| docs/search-spec.md | docs/product/search-spec.md |
| docs/permalink-spec.md | docs/product/permalink-spec.md |
| docs/export-matrix.md | docs/product/export-matrix.md |
| docs/task-4-permalink-status.md | docs/roadmap/history/task-4-permalink-status.md |
| docs/task-6-perf-a11y-budgets.md | docs/roadmap/history/task-6-perf-a11y-budgets.md |
| docs/task-7-logging-privacy.md | docs/roadmap/history/task-7-logging-privacy.md |

If an external bookmark relies on one of the removed paths, consider adding an HTTP redirect at the hosting layer (e.g., static redirect rules or reverse proxy) pointing old -> new.

