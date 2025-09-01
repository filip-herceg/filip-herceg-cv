> This document moved. New canonical path: `docs/engineering/admin.md`.

# Admin (Moved)

Original content relocated as part of documentation reorganization (Phase 2). Update links/bookmarks. This stub will be removed after link audit.

## Overview
The admin layer provides authenticated CRUD over CV domain entities plus session management. All endpoints are JSON-based under `/api/admin`.

Authentication uses an HTTP-only, secure, same-site session cookie issued on successful login. Subsequent requests must include this cookie. CSRF protection is applied to state‑changing auth endpoints (password change) via a token (handled internally; not yet required for entity CRUD). Rate limiting & backoff are enforced in the auth handlers.

## Auth Endpoints
| Endpoint | Method | Body | Success (200) | Error Codes |
|----------|--------|------|---------------|-------------|
| /api/admin/login | POST | `{ "username", "password" }` | `{ result: "OK" }` + session cookie | 400 (invalid JSON / missing), 401 (bad creds), 429 (rate limit) |
| /api/admin/logout | POST | none | `{ result: "LOGGED_OUT" }` (cookie cleared) | 401 (no session) |
| /api/admin/me | GET | n/a | `{ user: { username }, session: { issuedAt, expiresAt } }` | 401 (no session) |
| /api/admin/password | POST | `{ "newPassword", "csrfToken" }` | `{ result: "PASSWORD_CHANGED" }` (session rotated) | 400 (invalid JSON / weak pwd / missing token), 401 (no session) |

Notes:
- Password strength: must meet minimum length & complexity (see handler logic).
- Session rotation occurs on password change to mitigate fixation.

## CV Aggregate Endpoint
| Endpoint | Method | Query | Body | Success | Errors |
|----------|--------|-------|------|---------|--------|
| /api/admin/cv | GET | `locale?` (default `en`) | – | `{ data, design, source }` | 401 (unauth) |
| /api/admin/cv | POST | – | `{ locale: "<code>" }` | `{ result: "LOCALE_INITIALIZED" }` | 400 (invalid JSON), 401 |

## Entity CRUD Endpoints
Pattern: `/api/admin/entity/<entity>` for POST (create/update) and DELETE (delete).

Implemented entities: `skill`, `project`, `experience`, `education`, `certification`, `trait`, `hobby`.

### POST (Create / Update)
- URL: `/api/admin/entity/<entity>`
- Body: JSON shaped per entity schema + `locale`.
- Behavior: If `id` exists, updates; else creates.
- Response 200: `{ result: "UPSERTED", action: "create"|"update" }`.
- Errors: 400 on validation failure (includes `{ error: "VALIDATION_FAILED", issues: [...] }`), 401 no session.

### DELETE
- URL: `/api/admin/entity/<entity>?id=<id>&locale=<locale>`
- Success 200: `{ result: "DELETED" }`.
- Errors: 400 if missing `id` or `locale`, 401 if unauth.

## Validation
Each entity uses a Zod schema (see `src/lib/admin/*-handler.ts` or route) to ensure required fields and type correctness. Invalid JSON (parse failure) yields 400 with `{ error: "INVALID_JSON" }` before schema validation.

## Caching & Invalidation
- After successful mutation, the per‑locale aggregate cache layers (memory/redis/s3 where configured) are invalidated.
- Metrics: `cv_entity_mutations_total{entity,action,result}` increments on every POST/DELETE (success or error path) for observability.

## Logging
Structured logs (pino) emit event names like `domain:admin.skill.upsert_success`, `domain:admin.skill.validation_failed` including:
- `requestId` (trace correlation)
- `path`, `method`
- `action` (create|update|delete)
- `issues` count on validation failures

Errors include normalized `{ err: { name, message, stack } }` fields.

## Example Workflows

### Login
```bash
curl -i -X POST http://localhost:3000/api/admin/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"secret"}'
```
Capture `set-cookie` header for subsequent calls.

### Create Skill
```bash
curl -i -X POST http://localhost:3000/api/admin/entity/skill \
  -H 'content-type: application/json' \
  -H 'cookie: session=<value>' \
  -d '{"id":"skill-1","name":"TypeScript","category":"Language","level":"advanced","years":6,"locale":"en"}'
```

### Delete Skill
```bash
curl -i -X DELETE "http://localhost:3000/api/admin/entity/skill?id=skill-1&locale=en" \
  -H 'cookie: session=<value>'
```

## Security Notes
- Session cookie: HttpOnly, SameSite=Lax, Secure in production.
- Rate limiting on login reduces brute force exposure.
- Future Enhancements (planned): MFA option, audit log export, stricter CSRF on all state changes.

## Testing Strategy
- Unit tests per route file cover: valid create/update, validation failure, invalid JSON, delete missing id, delete success, synthetic error path.
- Auth tests validate login failure/success, password change rotation, logout, unauthenticated access.
- Integration harness aggregates multi-entity flows using in-memory cookie storage.

## Pending /admin UI
A dedicated `/admin` page (dashboard + forms) is not yet implemented. Planned minimal scope:
1. Auth gate (redirect to login component if no session)
2. Entity list + creation/update form
3. Locale selector & aggregate stats panel (pull from `/api/admin/cv`)
4. Surfaced mutation & cache metrics summary (optional)

## Quick Checklist Before Using
- Set initial admin credentials (bootstrap script or migration).
- Ensure `DATABASE_URL` is configured.
- (Optional) Enable Redis/S3 for caching by setting `CV_STORAGE=redis|s3` and related env vars.
- Confirm metrics at `/api/metrics` include `cv_entity_mutations_total` after first mutation.

---
This document will be updated once the `/admin` UI layer ships.
