---
title: Phase 1–2 repo cleanup (reports/, gitignore, budgets)
status: active
category: engineering
---

- Introduced reports/ as the central artifacts directory.
- Updated .gitignore to exclude reports/, test-results/, pa11y-screenshots/, and .lighthouseci/.
- Adjusted scripts/check-budgets.mjs to write to reports/budgets/budget-report.json while keeping a legacy root copy.
- Added scripts/docs-write-index.mjs to generate docs index into reports/docs/docs-index.json (stdout preserved for piping).
- No breaking changes to existing scripts; new scripts are additive.

Next steps:
- Redirect remaining ad-hoc outputs (eslint JSON, pa11y, lighthouse) into reports/.
- Update CI artifacts collection to pick up reports/**.
