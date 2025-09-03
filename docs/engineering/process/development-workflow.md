---
title: Development Workflow
category: engineering
status: active
lastUpdated: 2025-09-02
canonical: docs/engineering/development.md
---
<!-- Source: formerly docs/development.md -->
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
| lint:fix        | ESLint --fix                                      |
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

### Admin Auth Testing & Architecture (F17 Refactor)

Auth utilities were refactored to a frameworkΓÇæagnostic handler pattern for robustness and testability:

- Pure handler functions in `src/lib/auth/handlers.ts` implement login, logout, me, password change, CSRF issuance.
- A thin adapter layer (the Next.js route files) maps `Request` to handler input and applies returned cookie instructions.
- Cookie access is abstracted behind a `CookieStore` interface with two implementations:
	- `NextCookieStore` (wrapping `next/headers` request-scoped cookies API)
	- `MemoryCookieStore` (used in tests for deterministic inspection)
- Session lifecycle logic (creation, sliding renewal, destruction) lives in `src/lib/auth/session.ts` and never calls Next APIs directly.
- Rate limiting + exponential backoff are injected via a `RateLimiter` interface (default in-memory map; replace with Redis in multi-instance deployments).
- Handlers return a structured `HandlerResult` containing `{ status, body, cookies }`; the route adapter applies cookie mutations.

Benefits:
1. Unit/integration tests run without a Next runtime (no "cookies() outside request scope" errors).
2. Future features (MFA, Redis rate limiting, session revocation) only require new injected dependencies ΓÇô not route rewrites.
3. High observability: metrics (`auth_login_attempts_total`, `auth_active_sessions`) updated inside handlers via injected metric objects.
4. Security improvements: sliding session renewal, fixation mitigation (rotation on password change), enforced minimal password strength, exponential backoff, CSRF protection.

To add a new auth or admin CRUD endpoint:
1. Create a pure handler returning `HandlerResult`.
2. Add a route file that builds an `AuthContext`, invokes the handler, and applies cookie instructions.
3. Write tests using `MemoryCookieStore` and (optionally) a fake clock / random source by overriding `ctx.clock` for edge cases (e.g., session renewal thresholds).
4. For protected admin CRUD, use `requireAdmin` guard (in `src/lib/auth/guard.ts`).
5. Invalidate per-locale CV cache via `invalidateAggregateCache(locale)` after successful mutation.

#### Admin CRUD (F17)
- `/api/admin/cv` (GET) returns full aggregate with `{ data, design, source }` for a given locale (default `en`).
- `/api/admin/entity/skill` (POST, DELETE) first slice implemented; uses Zod validation (`SkillSchema`) extended with `locale`.
- Cache invalidation performed after skill create/update/delete; subsequent aggregate fetch reflects changes.
- Guard: `requireAdmin` ensures session presence; returns 401 JSON `{ error: 'UNAUTHORIZED' }` otherwise.

##### Implemented Entities (current slice)
- Skill, Project, Experience, Education, Certification, Trait, Hobby (each POST/DELETE) ΓÇö all instrumented via `cv_entity_mutations_total`.
- CV aggregate + invalidation endpoint.

The temporary coverage ignore blocks were removed after introducing a dedicated route harness and focused unit tests per entity. All CRUD adapters now have:
1. Unauthorized (401) guard test.
2. Validation failure (400) including parse fallback (invalid JSON) path.
3. Create vs update (distinguishing counter `action` label) including serialization of optional list fields.
4. DB error path exercising error counter increment.
5. Delete success + error (error still returns `{ result: 'deleted' }` while labeling metrics with `result=error`).

Additional parse-fallback tests were added for every entity to cover the `parse()` try/catch branch (invalid JSON -> empty object -> validation 400) improving branch coverage across entity route files (now ΓëÑ78% with most ΓëÑ88ΓÇô94%).

##### Route Harness
`admin-auth.test.ts` and related harness files exercise authenticated flows endΓÇætoΓÇæend using an inΓÇæmemory cookie store and a Prisma subset to verify session lifecycle, metric increments, and cache invalidation without relying on Next's request context internals.

##### Current Coverage Snapshot
Statements ~96.7%, Branches ~84%, Functions ~89%, Lines ~96.7% (V8). Target thresholds (90/80/75/90) are exceeded with headroom; remaining uncovered branches are lowΓÇævalue defensive lines (e.g., alternate error handling or rarely hit cookie branches).

##### Mutation Metrics
Counter: `cv_entity_mutations_total{entity,action,result}` ΓÇö observes volume & error rates per entity. Tests assert increments for success & error paths for every entity. Future: add alerting + SLO burn-rate panels.

Test patterns are shown in `src/tests/integration/admin-auth.test.ts` after the refactor.

#### Metrics Test Note

Because `prom-client` maintains a global registry that can interfere across test files, the metrics counter test swaps in a lightweight fake counter (`{ inc() }`) to assert that handlers increment both success and failure paths deterministically. This isolates behavioral verification (the handler calls) from library internals while other runtime tests (e.g. `/api/metrics`) exercise the real registry.

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

## Admin API & UI (F17)

See `admin.md` for detailed admin authentication & CRUD documentation. A `/admin` UI dashboard is planned; current implementation exposes authenticated JSON APIs only.

## Persistence (Local Dev)

Prisma schema targets SQLite for simplicity. If the database is empty (no `person` + `design` rows for a locale) the service now returns a deterministic onboarding placeholder (minimal person name "Your Name", empty arrays, default design sections) rather than reading embedded static JSON (legacy behavior removed in F16). This state is observable via the Prometheus counter `cv_aggregate_loads_total{source="empty"}`. Once you add real rows, loads switch to `source="db"`.

To inspect or modify data:

```bash
npx prisma db push
npx prisma studio
```

You can override the DB file path by exporting `DATABASE_URL` before starting dev.

Future: swap to Postgres (update `provider` and connection string) when multi-instance.

## Internationalization (i18n)

Locales: `en` (default) & `de`, pathΓÇæbased (`/de/...`). Translation catalogs live in `src/lib/i18n` and are accessed via `t(locale, key)`. Phase 2 implementation added:

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
