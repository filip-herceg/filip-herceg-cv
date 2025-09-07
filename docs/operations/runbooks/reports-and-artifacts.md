---
title: Reports and artifacts conventions
status: draft
---

Use reports/ to store generated artifacts. Paths:
- Lint: reports/lint/
- Tests: reports/tests/
- Coverage: coverage/ (kept at root by convention)
- Accessibility: reports/a11y/
- Lighthouse: reports/lighthouse/
- Docs index: reports/docs/docs-index.json
- Budgets: reports/budgets/budget-report.json

Environment variable: set REPORTS_DIR to override the base (defaults to reports/).
