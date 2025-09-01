> Moved: canonical file is `docs/roadmap/phase-2-roadmap.md` (legacy duplicate pending cleanup).
# Phase 2 Roadmap – Portfolio & CV Evolution

> Scope: Post-MVP enhancements after successful CV integration (full, short mode, print + PDF). Focus on showcasing engineering excellence (internationalization, observability, performance, reliability, personalization, accessibility).

## 1. Vision & Mission (Phase 2)
**Vision:** A demonstrably production‑grade personal engineering portal that adapts to audience needs, surfaces measurable impact, and illustrates modern platform practices (i18n, metrics, tracing, automation, resilience).

**Mission:** Incrementally deliver high‑leverage capabilities in short, verifiable slices while preserving current stability (tests ≥97% statements, green CI) and keeping operational complexity low.

## 2. Strategic Objectives & Target Outcomes
| Objective | Outcome KPI / Success Criteria |
|-----------|--------------------------------|
| Global Reach | ≥2 fully localized locales (en + second) incl. dynamic route alt links & hreflang; Lighthouse i18n pass |
| Content Agility | CV/projects/skills loaded from structured data layer (JSON/YAML or adapter) with schema validation <100ms at build |
| Observability & Reliability | Prometheus metrics exporter + ServiceMonitor; Grafana dashboard auto-import; p95 PDF generation < 2s (with cache) |
| Personalization & Analytics | Track selection interactions (skill/project) -> aggregated counts; display anonymized “popular picks” module |
| Performance | Edge caching/middleware for static CV responses; maintain LCP < 1.5s desktop, < 2.0s mobile |
| Accessibility & UX | Command palette (fuzzy search) + high contrast theme; axe/pa11y remain green |
| Release Quality | Automated semantic-release continues with ≥1 release / 2 weeks; zero failed rollouts (rollback mechanism remains unused or successful) |

## 3. Guiding Principles
1. **Incrementalism:** Each feature merges behind tests & metrics; no big-bang rewrites.
2. **Observability First:** New runtime paths emit metrics and logs from the start.
3. **Performance Guardrails:** Post-feature Lighthouse & Web Vitals deltas tracked.
4. **Accessibility Non-Negotiable:** New UI elements require keyboard & a11y test coverage.
5. **Determinism:** PDF output & localized pages deterministic across identical inputs.

## 4. Thematic Streams
| Theme | Goals |
|-------|-------|
| Internationalization (i18n) | Locale detection, routing, translations JSON, fallback, SEO hreflang |
| Content Decoupling | Move CV data into versioned structured source; unify validation; potential headless CMS adapter stub |
| Observability & Metrics | prom-client exporter, counters/gauges, Grafana dashboard, tracing (OpenTelemetry) |
| Personalization & Analytics | Interaction events (selection, PDF requests); aggregated API for popular skills/projects |
| Performance & Caching | Edge middleware caching, ETag correctness audit, PDF result caching (hash) |
| Accessibility & UX | Command palette, high contrast theme, improved keyboard flows |
| Reliability & Security | CSP tightening, image attestation (optional), uptime synthetic probe |

## 5. Milestone Timeline (Indicative)
| Sprint | Focus | Exit Criteria |
|--------|-------|--------------|
| 1 | i18n foundation + content extraction | 2 locales; schemas pass; tests added |
| 2 | Metrics exporter + Grafana + basic counters | /metrics served; dashboard imported; coverage unchanged |
| 3 | PDF caching + interaction analytics | p95 PDF <2s warmed; analytics endpoint returns top 5 skills/projects |
| 4 | Command palette + accessibility improvements | Palette keyboard accessible; axe clean; contrast theme toggle |
| 5 | Edge caching + tracing (OTel spans) | CDN-like headers; trace spans visible (local collector) |
| 6 (buffer) | Hardening & optional advanced items | Risk burndown ≤2 open; performance budget stable |

## 6. Detailed Backlog
| ID | Feature | Theme | Priority | Effort (S/M/L) | KPI Impact | Acceptance Criteria | Status |
|----|---------|-------|----------|----------------|------------|--------------------|--------|
| F01 | Locale routing & switcher | i18n | High | M | Global reach | /en & /de pages; hreflang tags present (routing + switcher + metadata alternates implemented) | Done |
| F02 | Translation resource loader (lazy) | i18n | High | M | Perf (bundle) | Only active locale JSON loaded; fallback to en verified; bundle size test | Done |
| F03 | Structured CV data module (static JSON) | Content | High | M | Agility | Initial static JSON + Zod validation scaffold (now extended by DB service & fallback) | Done |
| F16 | Persistent CV data layer (DB + schema) | Content | High | M | Agility | Empty default DB; Prisma schema; loader pulls per-locale rows; static fallback removed; onboarding empty state + metric cv_aggregate_loads_total (panel added) | Done |
| F17 | Admin auth & CRUD UI | Content | High | M | Agility/Security | Secure login, protected /admin, create/update/delete entities, validation | Done |
| F18 | Localization workflow & translation status | i18n | High | M | Global reach | Per-locale row creation, status indicators, missing translation fallback logic | Planned |
| F04 | prom-client exporter (/metrics) | Observability | High | S | Reliability | Counters: pdf_requests_total, permalink_creates_total; gauge: pdf_cache_entries | Done |
| F05 | ServiceMonitor verification test | Observability | Medium | S | Ops | helm template includes ServiceMonitor when enabled | Done |
| F06 | Grafana dashboard refinement (panels) | Observability | Medium | S | Insight | Dashboard JSON includes new counters | Done |
| F07 | PDF hash cache (LRU) | Performance | High | M | Perf p95 | Cache hit test; hashed by selection params | Done |
| F08 | Interaction analytics aggregation API | Personalization | Medium | M | Engagement | /api/analytics/popular returns top skills/projects | Planned |
| F09 | Command palette (fuzzy) | UX | Medium | M | Accessibility | Keyboard accessible, aria roles, tests | Planned |
| F10 | High contrast theme | UX | Medium | S | Accessibility | Meets WCAG contrast ratios; toggle persists | Planned |
| F11 | Edge caching middleware improvements | Performance | Medium | M | LCP | Cache headers & revalidation logic tests | Planned |
| F12 | OpenTelemetry spans (PDF + CV render) | Observability | Low | M | Reliability | Spans emitted with duration attributes | Planned |
| F13 | CSP tightening + report endpoint | Security | Low | S | Security | CSP blocks inline eval; violation logs captured | Planned |
| F14 | Synthetic uptime GitHub Action | Reliability | Low | S | Reliability | Nightly job fails on >1 failed probe | Planned |
| F15 | Popular selections widget | Personalization | Low | S | Engagement | Widget visible when analytics data available | Planned |

### Stabilization & Migration Track
| ID | Task | Theme | Priority | Effort | Acceptance Criteria | Status |
|----|------|-------|----------|--------|---------------------|--------|
| S01 | Rollback Node16/ESM big-bang attempt | Tooling | Critical | S | Typecheck <5 errors restored (pre-migration baseline) | Done |
| S02 | prom-client type resolution fix | Observability | High | XS | No TS2307; metrics module typed | Done |
| S03 | Metrics endpoint test coverage | Observability | High | S | Test asserts counters & gauge names in /api/metrics output | Done |
| S04 | Observability docs page | Docs | Medium | S | docs/observability.md created referencing metrics, ServiceMonitor & dashboard notes | Done |
| S05 | PDF cache gauge integration | Performance | Medium | M | pdf_cache_entries reflects cache size; hit/miss counters present | Done |
| S06 | Phased ESM migration plan (incremental) | Tooling | Low | S | Plan documented; no code breakage (see section 15) | Done |
| S07 | Optional OTel tracing scaffold | Observability | Low | M | Tracing behind feature flag; no prod impact | Done |

## 7. Acceptance Criteria (Summaries)
Each feature must:
1. Include/extend automated tests (unit + where relevant integration/E2E).
2. Preserve existing coverage thresholds (statements ≥97%).
3. Pass CI (lint, typecheck, security scans).
4. Update documentation (README or /docs) where user-visible.
5. Emit metrics/logs if runtime behavior changes.

## 8. Metrics & Dashboards
| Metric | Source | Target |
|--------|--------|--------|
| pdf_requests_total | prom-client counter | Trend increasing, error ratio <1% |
| pdf_cache_hit_ratio | Derived (hits/requests) | ≥50% after warm-up |
| permalink_creates_total | Counter | Growth week-over-week |
| cv_page_lcp_ms | Web Vitals (RUM) | p75 <1500 desktop, <2000 mobile |
| a11y_violations | pa11y/axe | 0 critical |
| release_lead_time_days | semantic-release tags | ≤14 |

## 9. Risk Register (Phase 2)
| ID | Risk | Impact | Likelihood | Mitigation | Trigger |
|----|------|--------|-----------|-----------|---------|
| R1 | i18n increases bundle size | Slower LCP | Medium | Lazy load locale JSON; measure after merge | Bundle diff > +30KB gzip |
| R2 | PDF caching memory growth | OOM | Low | LRU size cap + eviction metric | Memory > threshold |
| R3 | Metrics endpoint exposure | Info disclosure | Low | Restrict sensitive labels; no PII | Security review |
| R4 | Command palette accessibility gaps | Inaccessible UX | Medium | Keyboard + screen reader tests | a11y test fail |
| R5 | CSP breaks inline scripts | Functional regressions | Low | Report-only first; roll to enforce | Unexpected console CSP errors |

## 10. Dependencies & Sequencing Notes
- Implement structured data (F03) before analytics or i18n translations referencing IDs.
- Metrics exporter (F04) precedes Grafana refinement (F06) & cache monitoring.
- PDF cache (F07) benefits from metrics to validate hit ratio.
- Command palette (F09) after localization to avoid duplicate translation work.

## 11. Change Management / Workflow
1. Create feature branch `feat/<id>-short-label`.
2. Add or update tests first (TDD where practical).
3. Implement feature slice; keep PR < 400 LOC diff where possible.
4. Ensure coverage delta report no regressions (CI artifact).
5. Update this roadmap file: set Status → In Progress / Done with PR number.
6. Merge via squash (preserving conventional commit type).

## 12. Status Tracking Legend
| Status | Meaning |
|--------|---------|
| Planned | Not yet started |
| In Progress | Active development |
| Blocked | External dependency or decision pending |
| Done | Merged to main |
| Deferred | Moved beyond Phase 2 scope |

## 13. Definition of Done (DoD) Checklist
- [ ] Tests added/updated & passing
- [ ] Coverage unchanged or improved
- [ ] Docs updated (README or /docs)
- [ ] Metrics/logs emitted (if applicable)
- [ ] No Lighthouse score regression (>2 points) on key pages (/cv, /)
- [ ] a11y checks pass
- [ ] Performance budgets respected

### F17 Progress Log
- Slice 1 (A–F): Auth guard + session middleware; protected `/admin` layout and redirect-on-unauth; admin aggregate CV route.
- Slice 2: Skill entity create/update/delete handlers with Zod validation + integration tests; cache invalidation hooks wired.
- Slice 3: Extended CRUD to certification, education, experience, hobby, project, trait entities (route handlers + validation) with unit tests (`admin-*-route.test.ts`).
- Slice 4: Login/logout routes + session renewal tests; negative auth path tests (`admin-auth-routes.test.ts`).
- Slice 5: Error logging & structured event fields (pino) for admin operations; privacy classification added.
- Slice 6 (hardening): Added edge cases (validation failure, DB error) tests; ensured metrics unaffected & cache invalidation triggers.
- Follow-up (deferred): Overall statement coverage currently ~94% (< Phase 2 target 97%). Add targeted tests (redis/s3 storage branches, pdf-cache edge cases) under new task `F17-COV` to lift global coverage unless target adjusted.


## 14. Open Questions (Initial)
- Choose second locale: `de` already hinted—confirm? (If unconfirmed before Sprint 1, proceed with `de` + stub translator.)
- Headless CMS integration worth stub (Contentlayer vs simple local JSON)?

## 15. Next Immediate Action
Stabilize cache & tracing scaffold: monitor cache metrics for expected growth plateau; draft detailed phased ESM migration plan (separate doc) and evaluate adding histogram for PDF latency.

---
_Maintain this file in PRs; it’s a living artifact._
