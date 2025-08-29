# Development Workflow

## Prerequisites

- Node.js 20+
- npm (using npm consistently for lock determinism)
- Docker (optional for container build)

## Setup

```bash
npm ci
npm run dev
```

Visit http://localhost:3000

## Scripts

| Script          | Purpose                                           |
| --------------- | ------------------------------------------------- |
| dev             | Start dev server (Next.js)                        |
| build           | Production build (standalone)                     |
| start           | Run built app                                    |
| lint            | ESLint (flat config; non-blocking warnings)       |
| lint:ci         | Strict ESLint (no cache, max warnings = 0)        |
| typecheck       | TypeScript check                                 |
| typecheck:watch | Continuous TS checking (watch mode)              |
| test            | Vitest unit + integration w/ coverage             |
| test:watch      | Watch mode for Vitest                            |
| e2e / e2e:headed| Playwright end-to-end tests                      |
| lhci            | Lighthouse CI autorun (warn only)                 |
| prisma:generate | Regenerate Prisma client                         |
| prisma:studio   | (optional) Launch Prisma Studio                   |

## Adding UI Components (shadcn/ui)

```bash
npx shadcn add <component>
```

## Code Style

- Prettier (.prettierrc)
- EditorConfig enforced
- ESLint flat config extends next/core-web-vitals + custom rules
- Strict gate: CI & task `Lint: strict (CI)` use `npm run lint:ci` (fails on any warning)
- Scripts under `scripts/` are excluded from strict console rules to avoid false positives; application code (`src/`) enforces no `console.log`.

### Recommended local workflow

1. Rely on the background `CI: lint+typecheck+build+test` task for full checks.
2. For rapid feedback while coding, optionally run in parallel:
	- `npm run typecheck:watch`
	- `npm run test:watch`
3. Use `npm run lint:fix` before committing; Husky pre-commit (see below) will block if strict lint fails.

### Pre-commit hook (Husky)

If Husky is installed, a pre-commit hook runs: `npm run lint:ci && npm run typecheck && npm test -- --run --passWithNoTests` to catch issues early. Install & enable:

```bash
npx husky install
```

To skip hooks (rare/emergency): `git commit -m "msg" --no-verify`.

## Import Paths

Use `@/` alias mapping to `src/*`.

## Testing

Stack in place:

- Vitest for unit & integration tests (runs under jsdom / node as needed).
- Playwright for E2E (under `/src/tests/e2e`).
- Coverage via V8 (see summary after `npm test`).
- Accessibility (pa11y-ci) & performance (Lighthouse) tasks available.

Service layer tests spin up an ephemeral SQLite database file per spec by setting `DATABASE_URL=file:...` before importing Prisma client usage. This validates DB branch, fallback (invalid design), and cache hit behavior.

Run all tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

End-to-end (headless):

```bash
npm run e2e
```

## Persistence (Local Dev)

Prisma schema targets SQLite for simplicity. The first DB-backed CV load requires seeding at least `person` and `design` rows; otherwise the app transparently falls back to embedded static JSON. To inspect or modify data:

```bash
npx prisma db push
npx prisma studio
```

You can override the DB file path by exporting `DATABASE_URL` before starting dev.

Future: swap to Postgres (update `provider` and connection string) when multi-instance.

## Internationalization (i18n)

Locales: `en` (default) & `de`, path‑based (`/de/...`). Translation catalogs live in `src/lib/i18n` and are accessed via `t(locale, key)`. Phase 2 implementation added:

- Localized metadata (title, description, Open Graph, canonical, alternates)
- Structured data (`WebSite` + `Person` JSON-LD)
- Localized sitemap + consistent hreflang links
- Broad UI text coverage (navigation, hero, projects, contact form, tags)

See `i18n-seo-phase2.md` for full details & future roadmap (CV data localization, richer JSON-LD, Twitter cards).

`<LocaleHead />` plus layout ensure `<html lang>` + dynamic alternates; `localizedMeta()` centralizes per-page metadata generation.

Add a translation:
1. Add key to `messages.en.json` and translated value to `messages.de.json`.
2. Use `t(locale, 'key')` in components (pass locale inferred from path).
3. Add / update tests if UI text changes.

Example:

```tsx
import { t } from '@/lib/i18n';

export function Greeting({ locale }: { locale: string }) {
	return <p>{t(locale, 'nav.home')}</p>;
}
```

Testing localized output (Vitest + Testing Library):

```ts
render(<SiteHeader pathname="/de" />);
expect(screen.getByRole('link', { name: 'Startseite' })).toBeInTheDocument();
```

Troubleshooting:

- Wrong language? Ensure the first path segment matches a configured locale and that navigation uses correct prefixed links.
- Missing translation key: `t()` falls back to the key itself; add to all catalogs.
- Hreflang missing? Inspect rendered head in tests; use `waitFor` if client effect timing matters (though most alternates now server-provided via metadata).


