<!-- Source: formerly docs/vision-mission.md -->
# Vision & Mission

## Vision
Deliver a high-quality, performance-focused, internationally localized personal CV & portfolio platform that is easily extensible, observable, and secure.

## Mission
Iteratively build a modular system enabling dynamic CV content authoring, multilingual SEO-aware presentation, and export (PDF/permalink) features with strong engineering standards (testing, metrics, security-by-default).

## Strategic Pillars
1. Content Integrity (validated, versionable data model)
2. Internationalization & SEO (localized metadata, structured data, sitemap)
3. Performance & Accessibility (budgets, automated audits)
4. Observability & Reliability (metrics, tracing, error budgets)
5. Security & Privacy (least privilege, hashed secrets, no PII leakage)
6. Extensibility (pluggable feature modules, admin CRUD)

## North Star Metrics
| Metric | Definition | Target |
|--------|------------|--------|
| LCP p75 | Largest Contentful Paint (desktop/mobile) | <2.0s |
| CLS p75 | Cumulative Layout Shift | <0.1 |
| A11y Score | Lighthouse Accessibility | >=95 |
| Perf Score | Lighthouse Performance | >=90 |
| Error Rate | 5xx / total requests | <0.5% |

## Guiding Principles
- Favor stateless, pure modules for testability.
- Prefer explicit locale routing over negotiation for cacheability.
- Instrument early; validate product impact with metrics.
- Defer premature generalization until a second use case emerges.

## Out of Scope (Initial Phases)
- WYSIWYG rich text editing
- Third-party auth providers
- Real-time collaborative editing

---
Evolution tracked in roadmap docs; adjust metrics as product matures.