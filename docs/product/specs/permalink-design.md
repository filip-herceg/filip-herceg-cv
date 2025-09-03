---
title: Permalink Design
domain: product
category: spec
status: active
lastUpdated: 2025-09-03
canonical: docs/product/specs/permalink-design.md
---
# Permalink Design

Merged from `product/permalink.md` and `product/permalink-spec.md`.

## Objective
Generate short, stable, shareable URLs representing a snapshot or filtered view of the CV.

## Token Format
Base58 length 8–10 (avoid visually ambiguous characters).

## API
`POST /api/permalink` -> `{ token }`
`GET /p/<token>` -> HTTP 302 redirect to canonical localized CV.

## Persistence Schema
| Column | Type | Notes |
|--------|------|-------|
| token | string (PK) | Base58 key |
| createdAt | datetime | index |
| locale | string | default 'en' |
| payloadJson | text | serialized state |

## Current Implementation Notes
- Creation stores token + payload JSON; resolution fetches & redirects.
- Token generation: secure random bytes, Base58, retry on collision up to 5 attempts.

## Metrics
- `permalink_creates_total`
- `permalink_resolves_total`
- `permalink_resolve_failures_total` (planned)

## Error Handling
404 unknown token, future 410 expired, 422 malformed.

## Future Enhancements
- Snapshot freezing at creation.
- Expiration / cleanup job.
- Resolve analytics & failure counters.
