---
title: Repo cleanup (reports/, gitignore, budgets, report scripts)
status: completed
category: engineering
---

- Introduced reports/ as the central artifacts directory.
- Updated .gitignore to exclude reports/, test-results/, pa11y-screenshots/, and .lighthouseci/.
- Adjusted scripts/check-budgets.mjs to write to reports/budgets/budget-report.json exclusively (legacy root copy removed).
- Added scripts/docs-write-index.mjs to generate docs index into reports/docs/docs-index.json (stdout preserved for piping).
- No breaking changes to existing scripts; new scripts are additive.

Added in Phase 3:
- `npm run lint:report`, `npm run lhci:reports`, `npm run test:a11y:report` to emit artifacts under reports/.
- `scripts/reports-ensure-dirs.mjs` and `scripts/migrate-root-artifacts-to-reports.mjs` for safe migration.
- Optional cleanup script `npm run reports:clean-root`.

Next steps:
- Redirect remaining ad-hoc outputs (eslint JSON, pa11y, lighthouse) into reports/.
- Update CI artifacts collection to pick up reports/**.
 - Remove duplicate `pa11yci.json` (keep `.pa11yci.json`). [Done]

Added in Phase 4 updates:
- Helm lint/render CI now validates output with kubeconform (strict, ignore-missing-schemas) to catch schema issues early.
- Legacy `types/` folder removed; CI grace note can be dropped on the next main merge.
- Roadmap files under `docs/roadmap/current/` normalized to `YYYY-MM-*` naming.

See also: Phase 2 export roadmap in `docs/roadmap/current/2025-09-phase-2-roadmap.md` for product‑facing deliverables status.
