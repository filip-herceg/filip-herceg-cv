# Phase 2 Roadmap – Export Fidelity & Selective Application Packets

Status: draft
LastUpdated: 2025-09-03
Owner: product/engineering

## Goal
Deliver a reliable, high‑fidelity selective export pipeline (website → tailored PDF) that becomes the clear differentiator, while preserving performance, a11y, and observability foundations.

## High-Level Outcomes
- Admin can create multiple saved export configurations ("presets") selecting & ordering sections.
- PDF exports visually match on‑screen components (within defined drift tolerance) across A4 + Letter.
- Export completes < 4s median cold; < 2.5s warm (server cached assets / chromium reuse).
- Metrics & logs show < 1% failed exports and trace spans for 100% of export requests.
- Basic presets available (Comprehensive, Concise, Leadership, Technical) with overridable heuristics.

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
- Select rendering engine: Puppeteer (Chromium) vs. Playwright. (Assume Playwright already in dev deps.)
- Server route: POST /api/export (auth: admin) returning job id → poll OR direct streaming (decide after size test)
- Deterministic HTML snapshot: SSR page variant /export?config=ID (no animations, stable timestamps)
- Embed fonts subset + asset preload strategy
- Store produced PDF (stream to client + ephemeral cache (memory or disk LRU))

### 2. Section Selection MVP
- Data model: ExportConfig { id, name, sections: SectionRef[], createdAt, updatedAt, filters? }
- UI: Admin panel page /admin/exports
- Drag & drop ordering (keyboard accessible)
- Section toggles + top-N & tag filter fields (persist but may be no-op until heuristics slice)
- Versioning: simple updatedAt check (future diff history deferred)

### 3. Layout Fidelity & Styles
- Print stylesheet pass (media print + forced color adjustments)
- Density modes: normal | compact (line-height, margins)
- Diff harness: render canonical screen HTML & print HTML, compare serialized DOM & bounding boxes (tolerance config)
- Image / icon fallback (SVG inline) for consistent output

### 4. Presets & Heuristics
- Preset generator functions (e.g. buildLeadershipPreset(profile): ExportConfig)
- Heuristics: limit Projects to last 5 yrs or top impact score; limit Experience bullet points (future scoring placeholder)
- Quick Export button chooses last used preset
- Telemetry events: export_config_applied, export_section_filtered

### 5. Performance & Caching
- Warm pool of Chromium contexts (reuse between requests)
- Asset hashing & CDN headers (if hosting env supports) else server cache
- Parallel section pre-render (promise all) then assemble in export template (HTML concatenation not re-querying DB)
- Measure: instrumentation (start, domReady, pdfDone)

### 6. Observability & Reliability
- Traces: root span export.request with child spans (fetch.profile, render.html, chromium.launch, pdf.generate, store.cache)
- Metrics: histogram pdf_duration_ms, counter pdf_fail_total, gauge chromium_context_pool_size
- Structured error classes (ExportConfigNotFound, RenderTimeout, ChromiumCrashed)
- Health endpoint /api/export/health (pool status)

### 7. Security & Link Bridge
- Generate signed short-lived token for one-click latest preset export (shareable link)
- PDF footer: unobtrusive site URL + QR (SVG) + small note “Full interactive profile: <domain>”
- Robots: ensure export route not indexed
- Log redaction: remove PII / email from trace attributes

### 8. UX Polish & Accessibility
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
