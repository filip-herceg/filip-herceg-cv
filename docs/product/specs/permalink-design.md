## (Merged permalink + spec)
\n<!-- Source: docs/product/permalink.md -->\n
<!-- Source: formerly docs/permalink.md -->
# Permalink Implementation Notes

## Current State
Implements creation & resolution endpoints. Creation stores token + payload JSON; resolution looks up token returning redirect target.

## Token Generation
8ΓÇô10 char Base58 via secure random bytes; collision probability negligible with uniqueness check.

## Error Paths
- Collision retry loop (rare) attempts up to 5 new tokens.
- Unknown token -> 404 JSON `{ error: 'NOT_FOUND' }`.

## Observability
- Metrics: `permalink_creates_total` increments on success.
- TODO: add resolve counter & failures counters.

## Future
- Snapshot freeze (store full CV JSON at creation)
- Expiration / cleanup job
- Analytics on resolve frequency

## Testing
Unit tests cover token generation length & character set; integration tests cover create + resolve happy paths.
\n<!-- Source: docs/product/permalink-spec.md -->\n
<!-- Source: formerly docs/permalink-spec.md -->
# Permalink Specification

## Objective
Generate short, stable, shareable URLs representing a snapshot or filtered view of the CV.

## Token Format
- Base58 (avoid visually ambiguous chars) length 8ΓÇô10
- Encodes: timestamp (reduced), random entropy, optional variant bits

## API
`POST /api/permalink` -> `{ token }`
`GET /p/<token>` -> HTTP 302 redirect to canonical localized CV (with query parameters reconstructed if variant)

## Persistence
| Column | Type | Notes |
|--------|------|-------|
| token | string (PK) | Base58 key |
| createdAt | datetime | index |
| locale | string | default 'en' |
| payloadJson | text | serialized filter/view state |

## Expiration
No automatic expiration initial phase. Future: TTL cleanup job & soft deletion flag.

## Metrics
- `permalink_creates_total`
- `permalink_resolves_total`
- `permalink_resolve_failures_total`

## Error Handling
404 for unknown token, 410 for expired (future), 422 for malformed token.

## Security
Avoid embedding sensitive data; payload limited to non-PII CV filters.
