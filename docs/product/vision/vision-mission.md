<!-- Source: formerly docs/vision-mission.md -->
# Vision & Mission

## Vision
Provide professionals a single canonical, living CV website that is richer than any static document, yet can be distilled instantly into a tailored, visually faithful, standards‑compliant PDF optimized for a one‑file job application constraint.

## Mission
Build an opinionated personal CV platform where an admin (site owner) can:
1. Curate a comprehensive structured profile (skills, experience, projects, traits, education, certifications, languages, hobbies, personal identity, design layout).
2. Present it as a fast, accessible, localized, searchable full site.
3. Compose on demand a “light / application packet” export: a selective subset + reordered sections + style constraints rendered to high‑fidelity PDF (multi paper formats) including a subtle deep‑link back to the full site for reviewers who want more.
4. Iterate quickly with safe migrations, strong observability, and performance budgets so content & design changes are low‑risk.

## Strategic Differentiators
- Full vs. Light Duality: Treat the website as source of truth; generate ephemeral application‑specific PDFs (no manual layout gymnastics in Word or LaTeX).
- Selective Export Pipeline: Admin chooses sections, entry inclusion rules (top N, date range, tag filters), ordering, layout density, color mode, paper size, and optional contact / link blocks.
- Visual Parity: Export rendering uses the same component system (no separate print template drift) with controlled feature flags for fidelity vs. PDF constraints.
- Deep Link Bridge: Each PDF carries a branded, minimal call‑to‑action (URL + QR) to the full interactive version.
- Observability Loop: Export events, section selection stats, and recruiter visit follow‑through tracked anonymously to refine defaults.

## Pillars
1. Structured Data Fidelity (schema + validation + deterministic serialization)
2. Export UX & Customization (intuitive wizard, presets, diff preview)
3. Performance & Accessibility (core web vitals budgets, print media quality)
4. Internationalization & SEO (localized routes, structured data, canonical links)
5. Reliability & Observability (metrics, tracing, error budgets, audit logs of export configs)
6. Security & Privacy (scoped tokens for private exports, minimal PII exposure in logs)
7. Extensibility & Theming (pluggable section renderers, design tokens)

## North Star / Outcome Metrics
| Category | Metric | Target (Phase 2) |
|----------|--------|------------------|
| Export UX | Median export time (cold) | < 4s |
| Export Quality | Visual diff drift vs. site components | < 2% DOM node diff |
| Performance | LCP p75 (desktop/mobile) | < 2.0s |
| Accessibility | Lighthouse A11y Score | ≥ 95 |
| Engagement | PDF -> site visit follow‑through rate | ≥ 35% |
| Reliability | Failed export rate | < 1% |
| Observability | Trace coverage (export path) | 100% spans | 

## Guiding Principles
- Single Source Components: Never fork print vs. screen components—use responsive & media tweaks.
- Configuration as Data: Export selections stored & versioned (enables repeatable pipelines and A/B tweaks).
- Progressive Disclosure: Simple “Quick Export” defaults; advanced options behind ‘Customize’.
- Idempotent & Deterministic: Same inputs produce byte‑stable PDF (except embedded timestamps / IDs).
- Privacy First: No external trackers, only internal aggregated metrics.

## Out of Scope (Current Roadmap Cycle)
- Multi‑user collaboration / roles beyond single admin owner.
- Real‑time co‑editing.
- Full WYSIWYG rich text (structured markdown-like blocks only for now).
- AI auto‑resume writing (future plugin surface preserved).

## Future Opportunities
- Preset export templates per role (Backend, DevRel, Leadership) auto‑filtering content.
- Analytics feedback loop: highlight under‑viewed sections to refine brevity.
- Draft review links with temporary scoped visibility.

---
Roadmap will operationalize these pillars with phased, value‑centric slices.
