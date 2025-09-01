---
title: Documentation Index
category: index
status: active
lastUpdated: 2025-09-02
canonical: docs/README.md
---
# Documentation Index

> Phase 1 of restructuring: content is being migrated into domain folders. Old flat files will be redirected/cleaned up in Phase 2.

Machine-readable index: run `npm run docs:index` (outputs to stdout). Current snapshot committed as `docs-index.json` for tooling experiments.

## Product & Vision
- Vision & Mission (`product/vision-mission.md`)
- Roadmap (`roadmap/phase-2-roadmap.md`)
- Retrospectives (`f17-retrospective.md`)
- Specs (`product/taxonomy.md`, `product/search-spec.md`, `product/permalink-spec.md`, `product/export-matrix.md`, `product/i18n-seo-phase2.md`)

## Architecture & Design
- System Architecture (`architecture/architecture.md`)
- Persistence & CV Service (`architecture/persistence.md`)
- Admin Architecture (`architecture/admin.md`)
- Observability & Metrics (`architecture/observability.md`)

## Engineering Guides
- Development Workflow (`engineering/development.md`)
- CI/CD Strategy (`engineering/ci-cd.md`)
- Refactoring Plans (`engineering/refactoring/refactor-plan.md`, `engineering/refactoring/refactor-rate-limiter.md`)
- Performance & A11y Budgets (`roadmap/history/task-6-perf-a11y-budgets.md`)
- Logging & Privacy (`roadmap/history/task-7-logging-privacy.md`)
- Admin CRUD Guide (`engineering/admin.md`)
- Contributing (`contributing.md`)

## Operations
- Runbook (`operations/operations.md`)
- Kubernetes & Helm (`operations/kubernetes.md`)

## Internationalization
- Phase 2 i18n & SEO (`product/i18n-seo-phase2.md`)

## Historical / Completed Tasks
- Permalink Status (`roadmap/history/task-4-permalink-status.md`)
- CV Integration (`roadmap/history/cv-integration-plan.md`)
- Persistence & i18n Plan (`roadmap/history/cv-persistence-i18n-plan.md`)
- Rate Limiter Refactor (`engineering/refactoring/refactor-rate-limiter.md`)

## Governance
- Docs Reorg Plan (`roadmap/docs-reorg-plan.md`)

---
Status: Consolidated; next steps – fill TODO placeholders & remove legacy stubs after `npm run docs:links` shows zero stub references.
