# Export System

This document describes the Export Configs feature (Section Selection MVP slice) and current enhancements.

## Overview

Export Configs allow the admin to define named presets controlling which CV sections are included in a generated PDF, along with layout & rendering options:

- Sections list + ordering
- Optional per-section limits (e.g. cap projects count)
- Filters (projectSinceYear, experienceSinceYear)
- Density (normal|compact)
- Color mode (auto|monochrome)
- Paper size (A4|Letter)
- Optional presetType classification (e.g. COMPREHENSIVE / CONCISE)

## Data Model

Stored rows (Prisma model not shown here) include:

| Field | Purpose |
|-------|---------|
| id | Unique identifier (string UUID) |
| name | Human readable label |
| presetType | Optional category tag |
| sections | Ordered array of `{ key, limit? }` objects |
| filters | Optional `{ projectSinceYear?, experienceSinceYear? }` |
| density | 'normal' | 'compact' |
| colorMode | 'auto' | 'monochrome' |
| paperSize | 'A4' | 'Letter' |
| version | Incrementing integer for optimistic concurrency |
| createdAt / updatedAt | Timestamps |

## API

`/api/export/configs` supports CRUD with JSON bodies:

- GET: `{ configs: ExportConfig[] }`
- POST: body = draft (without id/version) -> returns `{ config }`
- PUT: body = `{ id, version, config: { ...updatedDraft } }` (server increments version)
- DELETE: `{ id }`

Validation errors return status 400 + `{ error: 'VALIDATION', issues: [...] }`.

Optimistic concurrency: A stale PUT (version mismatch) returns `409` + `{ error: 'CONFLICT' }`.

`/api/export/generate` accepts either a `config` inline specification or a stored `{ configId }`. When `configId` is passed the server loads, validates, derives selection and renders the PDF using the persisted config.

## Derive Selection

Selection logic (in `src/lib/export/selector.ts`) applies:

1. Filter CV entities by `projectSinceYear` / `experienceSinceYear` if present.
2. Optional tag filtering per section (implemented):
	- Projects/Experience: match by `stack` items (case-insensitive).
	- Skills/Education: match by each entity's `tags` array (case-insensitive).
	- When tags are present for a section, only matching items are retained before limits.
3. Apply per-section `limit` trimming arrays deterministically (original ordering preserved except truncated).
4. Produce a canonical selection object consumed by PDF generation.

## Admin UI

Path: `/admin/exports`.

Modes:
- List: table of existing configs with essential metadata.
- Create / Edit form: full draft editor.

Sections Builder:
- Add the next unused section quickly.
- Change section key via select (disallows duplicates).
- Limit field optional numeric.
- Optional tags (comma-separated, case-insensitive) per section to narrow selection.
- Reorder via Up / Down buttons (each has descriptive `aria-label`).
- Remove removes the row.

Status messaging appears inline beneath the list/form (simple text feedback sufficing for MVP). A 409 on save sets status to `Version conflict – refetching` and triggers a refetch + resets back to list view with updated version numbers.

## Optimistic Concurrency

The UI passes `id` + `version` on update. Backend compares stored version; mismatch -> 409. On success server increments and returns updated row. UI refresh strategy: refetch all configs after create/update/delete or conflict.

## Accessibility

- All interactive controls are standard buttons/selects/inputs with labels or `aria-label`s.
- Reorder buttons expose `aria-label="Move up"` / `"Move down"`.
- Form fields are wrapped in `<label>` with visible text.

Further audits (keyboard ordering hints, focus management) can be added later.

## Logging & Metrics

Logged domain events (see `src/app/api/export/configs/route.ts`):
- `domain:export.configs.list_success|list_error`
- `domain:export.configs.create_success|create_error`
- `domain:export.configs.update_success|update_error|update.invalid`
- `domain:export.configs.delete_success|delete_error|delete.invalid`
- Validation: `domain:export.configs.validation_failed|update.validation_failed`

Generation route logs its own events (success/error/validation) and records metrics:

Implemented metrics (see `src/lib/metrics.ts`):
- `export_requests_total` (counter)
- `export_success_total` / `export_failure_total` (counters)
- `export_cache_hit_total` / `export_cache_miss_total` (counters)
- `export_pdf_size_bytes` (histogram)
- `export_duration_seconds` (histogram of end‑to‑end export latency per attempt)
- `export_selection_derive_duration_seconds` (histogram measuring just the `deriveSelection` computation time)

Deferred: explicit UI action logging (client side capturing button clicks / form intents).

## Quick Export (Implemented)

The UI remembers the last-used config id in a cookie `last_export_config=<uuid>` (30d). When visiting `/admin/exports`, if that config still exists it’s highlighted and a "Quick Export Last" button is shown. Triggering any export updates the cookie.

## Edge Cases

- Empty sections array is rejected by schema (must contain at least one section).
- Duplicate section keys disallowed via UI & validated server-side.
- Large limits simply act as no-op if exceeding available entities.
- Stale version conflict handled gracefully (no destructive overwrite).

## Future Enhancements

- Drag & drop reordering in the builder
- Named presets registry & shareable links
- Bulk reorder via drag & drop
- Export preview (HTML snapshot) before PDF generation
- Metrics: per-config render counts, selection coverage histogram
- Client-side UI action logging (instrumenting button press events)

---
Last updated: Phase 2 Slice 4 – presets, telemetry, and tag filtering implemented.

## Chromium PDF Pool (Performance)

Status: landed. The PDF export path prefers a warm Chromium page from an in-process pool for faster warm performance and lower variance. If the pool isn’t available, it falls back to launching a one-off headless browser for the request.

Configuration (env vars):
- CHROMIUM_PATH: Absolute path to the Chromium/Chrome/Edge executable. If unset, the app tries several common paths (see CHROMIUM_CANDIDATE_PATHS).
- PDF_CHROMIUM_POOL_SIZE: Number of pages to keep available in the pool (default: 1).
- PDF_CHROMIUM_POOL_PRIME: When set to "true", the app will best-effort warm the pool on server start.

Behavior:
- The pool is lazily created on first use; metrics expose enabled flag and pool sizes.
- acquirePooledPage() returns a release() that must be called to return the page to the pool. At capacity, a one-off page is created and closed on release.

Metrics:
- chromium_pool_enabled (gauge: 0/1)
- chromium_pool_pages_total (gauge)
- chromium_pool_pages_busy (gauge)
- chromium_acquire_duration_seconds (histogram)

Operational notes:
- For Windows devs, CHROMIUM_PATH can point to Edge, e.g.: C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe
- In ephemeral serverless environments without a Chromium binary, the route returns 501 (unsupported) instead of crashing.

Benchmarks (Windows, Edge headless):
- cold: ~1233 ms
- warm p50: ~762 ms; p95: ~775 ms; avg: ~760 ms (8 iters)

Stability mitigations:
- Pooled page hygiene: navigate to about:blank on release.
- Request interception: abort /api/rum and /api/rum/stats during headless renders.
- Navigation readiness: use waitUntil='load' to avoid flakiness from background telemetry.
