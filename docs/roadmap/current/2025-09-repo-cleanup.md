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
- Short grace period: legacy `types/` folder is warn-only in CI for now; plan to fail CI after the grace period expires and remove the folder.
