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

Read path only today; write/admin & localization flows are planned (see Roadmap).

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

1. CRUD & Admin Auth (protect write endpoints, invalidate cache)
2. Localization workflow (multi-locale persistence)
3. Distributed cache (Redis) when >1 replica
4. Observability: metrics for cache hit ratio & load latency
5. Migrate dev DB to Postgres in CI for parity
