<!-- Source: formerly docs/permalink.md -->
# Permalink Implementation Notes

## Current State
Implements creation & resolution endpoints. Creation stores token + payload JSON; resolution looks up token returning redirect target.

## Token Generation
8–10 char Base58 via secure random bytes; collision probability negligible with uniqueness check.

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