<!-- Source: formerly docs/i18n-seo-phase2.md -->
# i18n & SEO Phase 2 Summary

## Goals
Enhance discoverability & localization quality: localized metadata (title, desc), structured data, hreflang, sitemap, alternate locales, JSON-LD.

## Implemented
- Path-based locale routing (`/de/...`)
- Localized site & page metadata builder (`localizedMeta`)
- Structured Data: `WebSite`, `Person` JSON-LD
- `<html lang>` + alternate link rendering
- Localized navigation & core UI strings via catalog lookup
- Sitemap entries per locale (planned follow-up if not yet merged)

## Helpers
| Helper | Purpose |
|--------|---------|
| detectLocaleFromPath | Extract locale from pathname prefix |
| localeFromHeaders | Infer default locale from Accept-Language (fallback en) |
| localizedMeta | Build merged metadata object with alternates |

## Remaining Backlog
- Localize persisted CV content (DB rows per locale)
- Richer JSON-LD (BreadcrumbList, Project)
- Twitter Card & OpenGraph image per locale
- Sitemap alternates if not yet deployed
- Translation missing-key telemetry

## Metrics (Planned)
- `i18n_missing_key_total{locale}`
- `i18n_requests_total{locale}`

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Inconsistent translation coverage | CI check counts keys per locale |
| SEO regression (hreflang missing) | Automated HTML snapshot test per locale |
