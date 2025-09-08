# Phase 2 Roadmap – Export Fidelity & Selective Application Packets

Status: active
LastUpdated: 2025-09-08 (visual diff baselines + thresholds wired)
Owner: product/engineering

## Goal
Deliver a reliable, high‑fidelity selective export pipeline (website → tailored PDF) that becomes the clear differentiator, while preserving performance, a11y, and observability foundations.

## High-Level Outcomes
- Admin can create multiple saved export configurations ("presets") selecting & ordering sections.
- PDF exports visually match on‑screen components (within defined drift tolerance) across A4 + Letter.
- Export completes < 4s median cold; < 2.5s warm (server cached assets / chromium reuse).
- Metrics & logs show < 1% failed exports and trace spans for 100% of export requests.
- Basic presets available (Comprehensive, Concise, Leadership, Technical) with overridable heuristics.

## Progress Snapshot (as of 2025-09-08)
- Completed
	- Headless PDF export route with direct streaming responses and cache integration in place (GET /api/cv/pdf; admin export generate route available).
	- Section selection and tag/stack filters implemented with per-section limits; query/hash helpers wired for URL/token flows.
	- Quick Export UX via cookie for last-used config; admin exports API and UI scaffolding present.
	- Metrics and tracing around selection/export (histograms, counters); structured logs with privacy considerations.
	- Solid test coverage across export pipeline components (unit + integration), including error branches.
	- Preset generator utilities shipped (Comprehensive, Concise, Leadership, Technical) with Admin UI "New from preset" actions.
	- Telemetry events added: export_config_applied (on create from preset) and export_section_filtered (when filters/limits prune selection).
- In Progress
	- Print polish and fidelity: print tokens and density/paper options added; visual diff harness landed with baselines; thresholds set to 2%.
- Upcoming
	- CI stability tuning for visual diffs (adjust per-OS thresholds if needed; keep 2% default where stable).
	- Chromium context warm pool for consistent warm performance.
	- Tokenized share link for latest preset export and footer QR.

## Phase Slices
| Slice | Objective | Key User Value | Exit Criteria |
|-------|-----------|----------------|---------------|
| 1. Export Core Infra | Introduce headless rendering + deterministic layout | First working full CV PDF (no selection) | Manual command produces stable PDF artifact |
| 2. Section Selection MVP | Allow choosing inclusion & order | User tailors PDF content | UI + persisted config (JSON) + reorder drag & drop |
| 3. Layout Fidelity & Styles | Harmonize print media styles & tokens | Branded, polished output | Visual diff suite under threshold (<2% node diff) |
| 4. Presets & Heuristics | Provide quick-start presets | Fast first export | 4 presets shipped + analytics events logged |
| 5. Performance & Caching | Reduce cold start cost | Faster iteration | Median cold export <4s; warm <2.5s |
| 6. Observability & Reliability | Full tracing & failure insight | Confidence & debuggability | 100% export traces + error classification |
| 7. Security & Link Bridge | Scoped tokens + deep link | Safe sharing + site traffic funnel | Tokenized export link w/ embedded CTA/QR |
| 8. UX Polish & Accessibility | Streamlined wizard + screen reader parity | Inclusive workflow | Axe/lighthouse a11y ≥95 on export UI |

## Detailed Work Breakdown
### 1. Export Core Infrastructure
- Status: foundational routes and streaming cache are in place; deterministic SSR snapshot variant is partially covered via export pages.
- Select rendering engine: Puppeteer (Chromium) vs. Playwright. (Assume Playwright already in dev deps.)
- Server route: POST /api/export (auth: admin) returning job id → poll OR direct streaming (decide after size test)
- Deterministic HTML snapshot: SSR page variant /export?config=ID (no animations, stable timestamps)
- Embed fonts subset + asset preload strategy
- Store produced PDF (stream to client + ephemeral cache (memory or disk LRU))

### 2. Section Selection MVP
- Status: selection + filters + limits implemented; admin exports page exists; drag & drop ordering is planned.
- Data model: ExportConfig { id, name, sections: SectionRef[], createdAt, updatedAt, filters? }
- UI: Admin panel page /admin/exports
- Drag & drop ordering (keyboard accessible)
- Section toggles + top-N & tag filter fields (persist but may be no-op until heuristics slice)
- Versioning: simple updatedAt check (future diff history deferred)

### 3. Layout Fidelity & Styles
- Status: print stylesheet exists; diff harness landed (flagged via `EXPORT_PRINT_DIFF=1`); fidelity tuning ongoing.
- Print stylesheet pass (media print + forced color adjustments)
- Density modes: normal | compact (line-height, margins)
- Diff harness: render canonical screen HTML & print HTML, compare serialized DOM & bounding boxes (tolerance config)
- Image / icon fallback (SVG inline) for consistent output

### 4. Presets & Heuristics
- Status: Preset generators implemented; Admin UI wired; telemetry events emitted.
- Preset generator functions (e.g. buildLeadershipPreset(profile): ExportConfig)
- Heuristics: limit Projects to last 5 yrs or top impact score; limit Experience bullet points (future scoring placeholder)
- Quick Export button chooses last used preset
- Telemetry events: export_config_applied, export_section_filtered

### 5. Performance & Caching
- Status: export caching is implemented; warm Chromium pool not yet.
- Warm pool of Chromium contexts (reuse between requests)
- Asset hashing & CDN headers (if hosting env supports) else server cache
- Parallel section pre-render (promise all) then assemble in export template (HTML concatenation not re-querying DB)
- Measure: instrumentation (start, domReady, pdfDone)

### 6. Observability & Reliability
- Status: metrics (histograms/counters) and tracing spans present; error branches covered in tests; health endpoint implemented at `/api/healthz`.
- Traces: root span export.request with child spans (fetch.profile, render.html, chromium.launch, pdf.generate, store.cache)
- Metrics implemented now: `export_requests_total`, `export_success_total`, `export_failure_total{reason}`, `export_duration_seconds`, `export_selection_derive_duration_seconds`, `export_pdf_size_bytes`; PDF route also exposes `pdf_requests_total`, `pdf_generation_duration_seconds`, cache hit/miss counters and gauges. Pool sizing gauge deferred.
- Structured error classes (ExportConfigNotFound, RenderTimeout, ChromiumCrashed)
- Health endpoint `/api/healthz` (generic liveness)

### 7. Security & Link Bridge
- Status: selection tokens in JSON/skills routes exist; dedicated signed one‑click export token and footer QR are pending.
- Generate signed short-lived token for one-click latest preset export (shareable link)
- PDF footer: unobtrusive site URL + QR (SVG) + small note “Full interactive profile: <domain>”
- Robots: ensure export route not indexed
- Log redaction: remove PII / email from trace attributes

### 8. UX Polish & Accessibility
- Status: baseline admin UI is usable; wizard preview and a11y polish are pending.
- Wizard improvements: live preview panel (server pre-renders HTML snapshot without PDF step)
- Keyboard ordering (roving tabindex + aria-grabbed)
- Announce export progress (aria-live region)
- Empty-state guidance + doc links

## Technical Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Chromium startup latency | Slow first export | Maintain warm pool; lazy prime on server start |
| Layout drift between screen & print | Inconsistent branding | Shared design tokens + diff harness in CI |
| Large PDF size | Email / ATS rejection | Font subsetting + image compression (SVG where possible) |
| Heuristic over-pruning | Loss of critical info | Preset preview diff + undo / revert to full config |
| Token leakage in logs | Security exposure | Central logging scrub + explicit allowlist fields |

## Metrics & Instrumentation Plan
- Add OpenTelemetry spans with attributes (preset, section_count, pdf_pages)
- Export success metric increments only after flush stream completes
- Daily aggregation script for export volumes & failure reasons
- Alert: pdf_fail_total > 5 in 10m OR pdf_duration_ms p95 > 8000

## Next Step Plan (to start now)
Focus: Slice 3 – Layout Fidelity & Styles (wrap-up) and kick off Slice 5 – Performance & Caching

Deliverables (small, incremental):
- Validate visual diff stability in CI runners; adjust thresholds OS-specifically if needed, otherwise keep 2% default.
- Expand diff coverage with 1–2 additional views if low risk (e.g., compact mode variant) and keep runtime fast.
- Prototype warm Chromium context pool and measure warm vs cold timings; add gauges/metrics for pool size.
- Prepare groundwork for tokenized share link + footer QR (schema + toggle, no external exposure yet).

How to run locally:
- Build and start the app (or rely on Playwright webServer in config).
- Set EXPORT_PRINT_DIFF=1 and run e2e tests; update snapshots only when intended visual changes are made.

Exit criteria for this step:
- Visual diffs pass on CI consistently across 3 consecutive runs without flaky failures.
- p50 warm export time trend improves vs baseline measurements; metrics available in logs.

## Definition of Done (Phase 2)
All slices 1–6 complete; 7 & 8 at least partially landed (footer link + a11y baseline). Metrics hitting targets for two consecutive weeks. No P1 reliability issues open. Documentation updated (operations runbook + product spec for export config format).

## Out of Scope (This Phase)
- Multi-profile personas (variant data sets) – planned next major phase.
- Full analytics dashboard UI (raw metrics only now).
- Advanced AI section summarization.

## Follow-Up / Next Phase Preview
- Persona variants & role-based preset suggestions
- i18n expansion for export (localized PDF strings)
- Analytics surfacing to admin for tuning content length

---
This roadmap aligns directly to Pillars 1–6 with an execution bias toward earliest demonstrable export value.
