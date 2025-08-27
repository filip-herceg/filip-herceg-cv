# Persistence & CV Service

## Overview
The CV data has transitioned from a purely static JSON bundle to a hybrid approach:

1. Attempt to load from a relational store via Prisma.
2. Validate & shape with Zod.
3. Cache the successful aggregate (data + design) for 60s per locale.
4. Fall back to embedded static snapshot on any failure.

## Current Stack
- ORM: Prisma
- Dev Database: SQLite (file based via `DATABASE_URL=file:...`)
- Entities (simplified): `person`, `skill`, `project`, `experience`, `education`, `certification`, `trait`, `hobby`, `design`
- Locale dimension: Not yet materialized; all rows currently treated as language‑agnostic. Future schema will introduce either a `locale` column per entity or locale-specific join tables.
- JSON fields stored as string columns (`*Json`) and parsed at read time.

## Service Contract
`getAggregate(locale)` -> `{ data: CvData; design: CvDesign; source: 'db' | 'static' }`

Success criteria:
- Returns within < 50ms (warm cache) in dev.
- Validation guarantees shape invariants downstream.

## Caching
In-memory map keyed by locale. TTL = 60s. Cache hit currently reported as `source: db` (future enhancement: distinguish `cache`).

## Failure Modes & Mitigations
| Failure | Detection | Mitigation |
| ------- | --------- | ---------- |
| Missing rows | `person` null | Fallback static |
| JSON parse error | Zod safeParse failure | Warn log + fallback |
| DB connectivity | Catch exception | Warn log + fallback |
| Stale cache after edit | (Write path not yet implemented) | Will clear cache on write |

## Roadmap
1. Write API & admin auth (mutations + cache invalidation).
2. Locale dimension (multi-locale rows, negotiation strategy) aligned with i18n Phase 2.
3. Postgres migration (connection pooling, migrations).
4. Distinguish `source: cache` vs `db` for observability.
5. Optional Redis cache for multi-pod deployment.
6. Structured metrics (hit ratio, latency histograms, fallback counter).
7. Content diff tooling to verify locale parity during rollout.

## Local Seeding Tips
```bash
npx prisma db push
npx prisma studio
```
Insert at least one `person` and one `design` row for your locale to activate DB path.

## Testing Strategy
Integration tests spin up isolated SQLite files per scenario:
- Happy path (`cv-service-db.test.ts`)
- Fallback on invalid design (`cv-service-fallback.test.ts`)
- Cache behavior (`cv-service-cache.test.ts`)

These ensure >100% statement coverage for the service and validate resilience.
