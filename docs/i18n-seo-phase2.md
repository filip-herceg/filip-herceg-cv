# Internationalization & SEO – Phase 2 Implementation

## Scope
Phase 2 delivered full localized metadata, hreflang alternates, structured data, and visible UI translation for English (en) and German (de), completing and extending the original F01 task list.

## Achievements
- Localized metadata for Home, About, Projects, Contact, CV pages using a reusable `localizedMeta(locale, keyBase, { path })` helper.
- Added Open Graph fields (title, description, url, siteName, locale, alternateLocale) per locale.
- Implemented canonical + `alternates.languages` mapping including `x-default` in every page's metadata.
- Introduced `detectLocaleFromPath` and `localeFromHeaders` helpers to centralize locale inference.
- Localized all primary visible UI strings (navigation, hero, headings, project cards, contact form states, tags).
- Added German translations for newly introduced keys.
- Injected structured data (JSON-LD) graph (`WebSite`, `Person`) in `layout.tsx` aligned with current locales.
- Ensured `<html lang>` reflects active locale.
- Added targeted tests: metadata generation, sitemap, hreflang head component, i18n helpers.
- Raised/maintained high coverage: overall ~96%+; i18n statements/lines 100% after test refinement.

## Helper Design
`localizedMeta` builds title/description from message catalogs under keys `meta.<page>.title|description` and constructs:
- `alternates.canonical`
- `alternates.languages` → `{ de: <url/de/...>, 'x-default': <canonical> }`
- `openGraph` with `locale` mapped (en→en_US, de→de_DE) + `alternateLocale` list.

## Structured Data
Current JSON-LD graph includes:
- `WebSite` with `name`, `url` (SITE_URL) and potential `inLanguage` future extension.
- `Person` representing the site owner with `name`, `url` and basic fields.
Future: add `BreadcrumbList`, `Project` entities, `ContactPage` / `AboutPage` specific nodes.

## Testing Additions
- `page-metadata.test.ts` & `localized-meta.test.ts` validate Open Graph locale + canonical + alternates.
- `locale-head.test.tsx` confirms hreflang links.
- `sitemap-route.test.ts` ensures sitemap alternates inclusion coverage.
- `i18n-helpers.test.ts` covers path + header locale detection.

## Translation Workflow (Updated)
1. Add keys to both `messages.en.json` & `messages.de.json`.
2. Reference via `t(locale, 'key')` inside server/page components.
3. For metadata, add `meta.<page>.title|description` keys and call `localizedMeta` in `generateMetadata`.
4. Run `npm test` to ensure no untranslated (raw key) strings appear.

## Fallback Strategy
- Header-based locale detection uses a try/catch requiring `next/headers`; on failure it returns `en` (safe default).
- Path-based detection drives routing and metadata.
- Missing translation keys surface as the key name, aiding discovery during development.

## Remaining / Future Phase 3 Ideas
| Area | Enhancement | Notes |
|------|-------------|-------|
| CV Content | Localize DB-backed CV text | Requires schema evolution (locale column or join table). |
| Structured Data | Add `BreadcrumbList`, `Project` items | Per-project descriptions already localized. |
| Social Cards | Add Twitter card metadata | Mirror Open Graph, add `twitter:card`, `site`, `creator`. |
| Coverage | Exercise fallback branch in `localeFromHeaders` | Mock require failure or run in edge-sim test. |
| Performance | Lazy load large future catalogs | Dynamic import by locale when file size grows. |
| Analytics | Track missing key usage | Hook into `t()` when `dict[key]` undefined. |

## Operational Notes
- Adding new locale: create `messages.<locale>.json`, register in `messages` map & update locale arrays in `localizedMeta` & sitemap generator; update tests similarly.
- Ensure canonical URLs stay stable (strip trailing slash, no query strings) before adding new locales.

## Quick Reference
| Helper | Purpose |
|--------|---------|
| `t(locale, key)` | Lookup translation (fallback to key) |
| `localizedMeta(locale, keyBase, { path })` | Build rich, localized metadata + OG + alternates |
| `detectLocaleFromPath(path)` | Infer 'en' or 'de' from leading path segment |
| `localeFromHeaders()` | Server-side safe detection via `x-pathname` header (middleware populated) |

## Example Metadata Usage
```ts
export function generateMetadata() {
  const locale = localeFromHeaders() // or detect from segment
  return localizedMeta(locale, 'home', { path: '' })
}
```

## Example UI Translation
```tsx
const locale = detectLocaleFromPath(pathname)
<h1>{t(locale, 'home.hero.heading')}</h1>
<p>{t(locale, 'home.hero.subheading')}</p>
```

---
_Last updated: 2025-08-27_
