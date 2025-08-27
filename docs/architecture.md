# Architecture

## Overview

A containerized Next.js 14 (App Router) application served via Node.js (standalone output) and deployed to Kubernetes with optional Helm chart. CI builds, lints, and pushes a container image to GHCR; CD performs a Helm upgrade.

## Layers

- UI: Next.js App Router pages/components (Tailwind + shadcn/ui + Framer Motion)
- API Routes: /api/healthz, /api/contact, /api/rum
- Styling: Tailwind CSS + design tokens (CSS vars) + shadcn primitives
- Runtime: Node 20 Alpine (Docker multi-stage)
- Deployment: K8s manifests (raw) and Helm chart for customization

## Data / State

Hybrid model:

- Primary CV content & design now load DB‑first via a service (`getAggregate`) backed by Prisma. Development uses a local SQLite file (via `DATABASE_URL=file:...`).
- If DB rows (person + design) are present and parse cleanly through Zod schemas, the result is cached in‑memory (TTL 60s) per locale and served with `source: db`.
- On missing rows, validation failure, or query error the service falls back to embedded static JSON (original bootstrap) with `source: static`.
- Contact endpoint remains a stub with optional email provider (Resend) integration when env vars present.

Read path only today; write/admin flows are planned.

### Internationalization (Current Status)

Initial internationalization (i18n) infrastructure is in place:

- Next.js `i18n` config enables locales `en` (default) & `de`.
- Path-based locale prefix for non-default locales (`/de/...`).
- Lightweight message catalogs (`messages.en.json`, `messages.de.json`) + helper `t(locale, key)` used in navigation UI.
- `<LocaleHead />` client component sets `<html lang>` and injects `hreflang` alternates (currently coarse: mirrors current path in both locales & `x-default`).
- Per‑locale in‑memory CV cache keying already anticipates future multi-locale persisted data (today underlying DB content is effectively single-locale / language‑agnostic).

Pending (Phase 2 – i18n SEO & Content Enhancements):

1. Localized sitemap with `<xhtml:link rel="alternate" hreflang="..."/>` entries.
2. Page-level localized metadata via `generateMetadata` (title, description, Open Graph, canonical, `og:locale:alternate`).
3. Localized persisted CV content (additional tables or locale column) and negotiation fallback chain.
4. Lazy loading / code-splitting of large translation sets when catalogue size grows.

Non-goals (for now): runtime locale negotiation via Accept-Language (explicit URL chosen for cacheability / SEO clarity).

## Key Decisions

| Aspect        | Choice                       | Rationale                                               |
| ------------- | ---------------------------- | ------------------------------------------------------- |
| Framework     | Next.js 14 App Router        | Server components + partial static generation           |
| UI Kit        | shadcn/ui                    | Accessible, composable primitives                       |
| Animations    | Framer Motion                | Declarative animation API                               |
| Persistence   | Prisma (SQLite dev)          | Fast local dev; path to Postgres later                  |
| Validation    | Zod                          | Runtime safety & typed inference                        |
| Container     | Standalone build             | Smaller image & minimal runtime deps                    |
| Config Mgmt   | ConfigMap/Secret             | 12-factor alignment                                     |
| Scaling       | HPA CPU-based                | Simple initial elasticity                               |
| Caching       | In-memory (60s TTL)          | Avoid repeated DB aggregation per request               |
| PDF Generation| Playwright (conditional)     | Enables printable/export flows; graceful 501 fallback   |
| i18n Strategy | Explicit locale in URL       | SEO-friendly, cacheable & user-copyable links           |

## Diagram (Logical)

```
User -> Ingress -> Service -> Pod (Next.js) -> (API Routes)
                                |-> /api/healthz
                                |-> /api/contact (stub)
                                |-> /api/rum (web vitals)
```

## Service Layer Details

`src/lib/cv/service.ts` aggregates all localized CV tables plus a design table into a structured `CvData` + `CvDesign` object. It:

- Performs parallel Prisma queries.
- Parses JSON sub-fields (e.g., `linksJson`, `highlightsJson`).
- Validates with Zod; on success caches; on failure logs warnings and falls back.
- Returns discriminated `source` to aid observability & tests.

Cache invalidation will accompany future write APIs (admin edits) by clearing locale keys.

## Extensibility

- Swap SQLite for Postgres (minimal schema change) for multi-instance deployments.
- Replace in-memory cache with Redis for shared cache in horizontal scaling scenario.
- Introduce write endpoints + auth (session / OAuth) for live editing.
- Add localization tables (locale dimension) and negotiation.
- Queue (e.g., Service Bus) for background PDF/email tasks.

## Roadmap (Next)

1. Incremental i18n SEO: sitemap alternates & localized metadata (complete F01)
2. CRUD & Admin Auth (protect write endpoints, invalidate cache)
3. Multi-locale persistence model (schema evolution + negotiation fallback)
4. Distributed cache (Redis) when >1 replica
5. Observability: metrics for cache hit ratio & load latency
6. Migrate dev DB to Postgres in CI for parity
7. Structured PDF export service hardening & queue offloading (optional)
