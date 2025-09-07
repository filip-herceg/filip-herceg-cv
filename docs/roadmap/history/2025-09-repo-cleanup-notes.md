---
title: Repo cleanup groundwork (reports/, budgets)
status: completed
---

Completed:
- Centralized artifacts under reports/ and added a reports runbook.
- Budget report now saved to reports/budgets/ and legacy root.
- Removed duplicate pa11yci.json (kept .pa11yci.json).

Follow-ups:
- Redirect ESLint, Pa11y, and Lighthouse outputs into reports/.
- Update CI to collect artifacts from reports/**.
