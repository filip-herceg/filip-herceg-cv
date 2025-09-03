---
title: System Architecture
category: architecture
status: active
lastUpdated: 2025-09-02
canonical: docs/architecture/architecture.md
---
<!-- Source: formerly docs/architecture.md -->
# System Architecture

## Overview

A containerized Next.js 14 (App Router) application served via Node.js (standalone output) and deployed to Kubernetes with optional Helm chart. CI builds, lints, tests (unit + integration + coverage + Lighthouse + accessibility) and pushes a container image to GHCR; CD performs a Helm upgrade. Core backend concerns (auth, session lifecycle, metrics, CV data aggregation) are implemented in pure, frameworkΓÇæagnostic modules for high testability.

## Layers

- UI: Next.js App Router pages/components (Tailwind + shadcn/ui + Framer Motion)
- API Routes: /api/healthz, /api/contact, /api/rum, /api/metrics, admin auth endpoints (login/logout/me/password)
- Styling: Tailwind CSS + design tokens (CSS vars) + shadcn primitives
- Runtime: Node 20 Alpine (Docker multi-stage)
- Deployment: K8s manifests (raw) and Helm chart for customization

## Data / State

Hybrid model:

- Primary CV content & design now load DBΓÇæfirst via a service (`getAggregate`) backed by Prisma. Development uses a local SQLite file (via `DATABASE_URL=file:...`).
- If DB rows (person + design) are present and parse cleanly through Zod schemas, the result is cached inΓÇæmemory (TTL 60s) per locale and served with `source: db`.
- On missing rows, validation failure, or query error the service falls back to embedded static JSON (original bootstrap) with `source: static`.
- Contact endpoint remains a stub with optional email provider (Resend) integration when env vars present.

Read path only for CV content; a minimal admin auth surface exists solely for future write APIs & operational introspection.

### Internationalization (Status After Phase 2)

Phase 2 completed the i18n & SEO uplift:

- Locales: `en` (default) & `de` path-based (`/de/...`).
- Message catalogs with simple lookup `t(locale, key)` now applied across navigation, hero, section headings, projects, contact form, tags.
- Central helpers: `detectLocaleFromPath`, `localeFromHeaders`, `localizedMeta` (builds canonical, alternates, Open Graph w/ locale & alternateLocale).
- `<LocaleHead />` / root layout ensure `<html lang>` plus consistent hreflang links; sitemap entries localized (with alternates).
- Structured data (JSON-LD) for `WebSite` + `Person` injected per page render.

Upcoming (Phase 3 candidates): localized persisted CV content, richer JSON-LD (BreadcrumbList, Projects), Twitter Card metadata, dynamic catalog loading, analytics on missing keys. Accept-Language negotiation remains out-of-scope for cacheability & SEO clarity.

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
| Auth          | Pure handlers + session cookie| Deterministic tests, decoupled from Next request scope  |
| Security      | Scrypt hashing + rotation     | Strong password hashing + session fixation mitigation   |
| Metrics       | prom-client (Counter/Gauge)   | Operational visibility (login attempts, active sessions) |
| PDF Generation| Playwright (conditional)     | Enables printable/export flows; graceful 501 fallback   |
| i18n Strategy | Explicit locale in URL       | SEO-friendly, cacheable & user-copyable links           |

## Auth & Session Architecture

Auth logic is split into:

1. Pure handlers (`src/lib/auth/handlers.ts`): login, logout, me, password change, CSRF token issuance.
2. Session utilities (`src/lib/auth/session.ts`): create/destroy session, sliding renewal based on remaining TTL fraction (default renew when <50% remains), rotation on password change.
3. Cookie abstraction (`CookieStore`): `NextCookieStore` (runtime) and `MemoryCookieStore` (tests) enable deterministic testing outside Next's request context.
4. Rate limiter interface with pluggable backends: in-memory & Redis (distributed) behind a fallback wrapper.
5. Metrics instrumentation (login attempts Counter labeled success/failure, active sessions Gauge) injected via context.

Security features:

- Scrypt password hashing with salt
- Exponential backoff on failed logins (sleep before response)
- Session fixation mitigation (session id rotated after password change)
- Sliding session renewal (reduces silent expiries during activity)
- CSRF double-submit cookie for password change
- Minimum password length enforcement (>=12)

Testing strategy:

- All handlers exercised via `admin-auth.test.ts` using `MemoryCookieStore` and a fake clock for renewal threshold scenarios.
- Metrics counter test uses a fake counter implementation to avoid prom-client global registry interference while still proving handler calls.

Planned hardening (selected updates):

- MFA / TOTP integration layer
- Redis-backed rate limiter (implemented) & future external session store for multi-replica consistency
- IP / device fingerprinting & anomaly logging

### Rate Limiting & Fallback Flow (Login Failure)

```
User -> /api/admin/login -> Auth Handler
    -> RateLimiter.recordFailure(username)
	    -> (Redis primary) INCR + PEXPIRE
		    (on first redis error) log auth.rate_limiter.redis_error, switch to memory
	    -> delay (exponential + optional jitter)
    -> respond 401 after sleep with backoffMs
```

## Diagram (Logical)

```
User -> Ingress -> Service -> Pod (Next.js) -> (API Routes)
				|-> /api/healthz
				|-> /api/contact
				|-> /api/rum /api/rum/stats
				|-> /api/cv/* (data & PDFs)
				|-> /api/admin/* (auth handlers)
				|-> /api/metrics (Prometheus)
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

## Production Hardening Roadmap

1. Protect future write APIs with current auth handlers (add role claims, MFA)
2. Multi-locale persistence model (schema evolution + negotiation fallback)
3. Distributed cache (Redis) & centralized session store
4. Additional metrics: cache hit ratio, DB latency histogram, fallback counter, per-locale request counts
5. Postgres migration & connection pooling for horizontal scaling
6. Queue (e.g., Service Bus) for PDF/email offloading & retry semantics
7. Security: CSP, strict transport security headers, dependency scanning, image signing (cosign), SBOM
8. Observability: OpenTelemetry traces (HTTP + DB spans), log correlation ids (already seeded by logger)
9. Performance: CDN caching for static assets, tuned PDF generation concurrency

## Production Readiness Checklist

- [x] Containerized & reproducible build
- [x] Health endpoint (`/api/healthz`)
- [x] Structured logging with privacy tagging
- [x] Unit + integration test suite (184 tests, >90% statement coverage)
- [x] Auth handlers with password hashing, rate limiting, session renewal
- [x] Session fixation mitigation on password change
- [x] Prometheus metrics endpoint including auth metrics
- [x] Graceful PDF feature fallback (501) when Chromium unavailable
- [x] i18n path-based routing & localized metadata
- [x] Accessibility & performance CI (pa11y, Lighthouse)
- [ ] Secrets & config documented in Helm values (expand for email, DB, auth) 
- [x] Add explicit security headers middleware (CSP, HSTS, referrer policy, permissions policy)
- [ ] Postgres deployment manifests when leaving SQLite
- [ ] Production rate limiter store (Redis) & session persistence across replicas
