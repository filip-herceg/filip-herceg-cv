---
title: Persistence & CV Service
category: architecture
status: active
lastUpdated: 2025-09-02
canonical: docs/architecture/persistence.md
---
<!-- Source: formerly docs/persistence.md -->

> TODO: Expand with DB schema excerpt, cache invalidation flow diagram, and fallback decision matrix.

## Overview
The persistence layer replaces the original static JSON bootstrap with a database‑backed, locale‑aware aggregate service. Reads are optimized for low latency and deterministic fallbacks; writes (admin CRUD) invalidate targeted caches.

## Data Flow
```
Request -> CvAggregateService.get(locale)
					 │
					 ├─ Cache hit? → return (source: cache)
					 │
					 ├─ DB query (person, design, collections per entity)
					 │      └─ Zod validation (aggregate schemas)
					 │            ├─ success → build aggregate, store in cache (TTL 60s), return (source: db)
					 │            └─ failure → log warn, attempt static fallback
					 └─ Static fallback (on empty DB or validation failure) → onboarding aggregate (source: empty)
```

## Schema Snapshot (Excerpt)
```prisma
model Skill {
	id       String  // logical id (stable)
	locale   String
	name     String
	category String
	level    String? // optional
	years    Int?    // optional
	tags     String[]
	@@unique([id, locale])
}
```

Pattern repeats per entity (`Project`, `Experience`, etc.) with `(id, locale)` uniqueness for simplicity over normalization.

## Fallback Decision Matrix
| Condition | Action | Metric / Log |
|-----------|--------|--------------|
| DB rows present & valid | Serve DB aggregate | `cv_aggregate_loads_total{source="db"}` |
| No rows (fresh instance) | Serve onboarding placeholder | `cv_aggregate_loads_total{source="empty"}` |
| Validation failure | Log warning & serve static if available, else empty | warn: `cv data parse failed` |
| DB error (transient) | Serve cached (stale) if within TTL else static/empty | (planned metric) failures counter |

## Cache Strategy
In‑memory map keyed by `locale`. TTL 60s (configurable future). Invalidation occurs after successful mutation or locale initialization. Future enhancement: ETag hash for conditional responses and PDF cache key.

## Write Path (Planned)
Admin CRUD endpoints upsert localized rows. After commit: recompute or invalidate locale aggregate → next read repopulates.

## TODO
- Add ETag + conditional GET logic
- Introduce latency histogram and cache hit ratio metrics
- Add stale (serving cached during DB outage) counter

See historic plan: `docs/roadmap/history/cv-persistence-i18n-plan.md` for original rationale.
