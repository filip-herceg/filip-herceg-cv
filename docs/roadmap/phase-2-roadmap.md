---
title: Phase 2 Roadmap
category: roadmap
status: active
lastUpdated: 2025-09-02
canonical: docs/roadmap/phase-2-roadmap.md
---
<!-- Source: formerly docs/phase-2-roadmap.md -->
# Phase 2 Roadmap

## Themes
1. Localization & SEO completeness
2. Admin CRUD breadth expansion
3. Observability depth (metrics + tracing)
4. Security hardening (rate limiter externalization, signing, SBOM)

## Key Epics
| Epic | Description | Success Metric |
|------|-------------|----------------|
| i18n data localization | Persist per-locale entities | 100% locale parity |
| Admin CRUD expansion | Add remaining entity CRUD endpoints | 100% entity coverage |
| Observability phase | Add latency histograms, fallback counters | p95 DB <50ms |
| Supply chain | Signed images + SBOM + attestation | 100% signed builds |
| Performance budgets | Enforce LH & Web Vitals thresholds | Perf score ≥90 |

## Milestones
- M1: CRUD completeness
- M2: i18n persisted data
- M3: Observability metrics expansion
- M4: Supply chain security
- M5: Performance enforcement

## Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Scope creep | Delays | Strict milestone criteria |
| Locale data drift | Inconsistent UX | CI key parity check |
| Performance regression | SEO/user impact | Budgets + profiling |

## Dependencies
- Prisma migrations (locale columns)
- Redis deployment (rate limiter)
- Metrics pipeline readiness

## Exit Criteria
All milestones complete + KPIs stable across 2 consecutive releases.