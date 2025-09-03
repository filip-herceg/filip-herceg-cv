---
title: Legacy Doc Aliases
domain: meta
category: mapping
status: active
lastUpdated: 2025-09-03
canonical: docs/meta/legacy-aliases.md
---
# Legacy Documentation Aliases

Mappings from removed / relocated documentation paths to their new canonical locations. Update this file whenever a doc is renamed or deleted.

| Old Path | New Canonical Path | Notes |
|----------|--------------------|-------|
| docs/contributing.md | docs/contributing/contributing.md | Moved into contributing/ subfolder |
| docs/product/vision-mission.md | docs/product/vision/vision-mission.md | Refiled under vision/ |
| docs/product/taxonomy.md | docs/product/vision/taxonomy.md | Refiled under vision/ |
| docs/product/search-spec.md | docs/product/specs/search.md | Renamed to concise slug |
| docs/product/export-matrix.md | docs/product/specs/export-matrix.md | Category folder change |
| docs/product/export-matrix-old.md | (removed) | Content superseded by export-matrix.md |
| docs/product/i18n-seo-phase2.md | docs/product/specs/i18n-seo-phase2.md | Category folder change |
| docs/product/permalink.md | docs/product/specs/permalink-design.md | Merged into design doc |
| docs/product/permalink-spec.md | docs/product/specs/permalink-design.md | Merged into design doc |
| docs/roadmap/history/task-4-permalink-status.md | docs/product/history/task-4-permalink-status.md | History moved to product/history |
| docs/roadmap/history/task-6-perf-a11y-budgets.md | docs/product/history/task-6-perf-a11y-budgets.md | History moved to product/history |
| docs/roadmap/history/task-7-logging-privacy.md | docs/product/history/task-7-logging-privacy.md | History moved to product/history |
| docs/architecture/architecture.md | docs/architecture/overview/architecture.md | Overview category |
| docs/architecture/persistence.md | docs/architecture/domains/persistence.md | Domain grouping |
| docs/architecture/admin.md | docs/architecture/domains/admin.md | Domain grouping |
| docs/architecture/observability.md | docs/architecture/cross-cutting/observability.md | Cross-cutting grouping |
| docs/engineering/development.md | docs/engineering/process/development-workflow.md | Clearer slug |
| docs/engineering/ci-cd.md | docs/engineering/process/ci-cd.md | Refiled under process |
| docs/ci-cd-review.md | docs/engineering/process/ci-cd.md | Merged historical review |
| docs/refactor-plan.md | docs/engineering/refactoring/refactor-program.md | Renamed scope broader |
| docs/refactor-rate-limiter.md | docs/engineering/refactoring/rate-limiter-refactor.md | Refiled under refactoring |
| docs/esm-migration-plan.md | docs/engineering/process/esm-migration-plan.md | Refiled under process |
| docs/operations/operations.md | docs/operations/runbooks/operations.md | Runbook categorization |
| docs/operations/kubernetes.md | docs/operations/platform/kubernetes.md | Platform categorization |
| docs/phase-2-roadmap.md | docs/roadmap/current/phase-2-roadmap.md | Roadmap structuring |
| docs/f17-retrospective.md | docs/roadmap/retrospectives/f17-retrospective.md | Retrospective category |
| docs/cv-integration-plan.md | docs/roadmap/plans/cv-integration-plan.md | Plans category |
| docs/cv-persistence-i18n-plan.md | docs/roadmap/plans/cv-persistence-i18n-plan.md | Plans category |
| docs/legacy-aliases.md | docs/meta/legacy-aliases.md | Moved to meta |
| docs/_delete-test.md | (removed) | Temporary test file deleted |

## Maintenance
- Keep rows sorted roughly by original path.
- For removals without replacement keep New Path blank or mark (removed).
- Ensure docs guard script updated if needed.
