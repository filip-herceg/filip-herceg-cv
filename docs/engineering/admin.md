---
title: Admin Authentication & CRUD
category: engineering
status: completed
lastUpdated: 2025-09-02
canonical: docs/engineering/admin.md
---
<!-- Source: formerly docs/admin.md -->
# Admin Authentication & CRUD

Status: F17 COMPLETE – API + initial `/admin` endpoints implemented & tested. See `f17-retrospective.md` for closure summary.

## Overview
Authenticated CRUD over CV domain entities plus session management. All endpoints JSON-based under `/api/admin`.

Authentication uses an HTTP-only, secure, same-site session cookie. CSRF token required for password change (double-submit). Rate limiting & exponential backoff enforced on login.

## Auth Endpoints
| Endpoint | Method | Body | Success (200) | Error Codes |
|----------|--------|------|---------------|-------------|
| /api/admin/login | POST | `{ "username", "password" }` | `{ result: "OK" }` + session cookie | 400 (invalid JSON/missing), 401 (bad creds), 429 (rate limited) |
| /api/admin/logout | POST | none | `{ result: "LOGGED_OUT" }` (cookie cleared) | 401 (no session) |
| /api/admin/me | GET | – | `{ user: { username }, session: { issuedAt, expiresAt } }` | 401 (no session) |
| /api/admin/password | POST | `{ "newPassword", "csrfToken" }` | `{ result: "PASSWORD_CHANGED" }` (session rotated) | 400 (invalid/weak/missing), 401 (no session) |
| /api/admin/csrf | GET | – | `{ csrfToken }` + cookie | – |

## CV Aggregate Endpoint
| Endpoint | Method | Query | Body | Success | Errors |
|----------|--------|-------|------|---------|--------|
| /api/admin/cv | GET | `locale?` (default `en`) | – | `{ data, design, source }` | 401 unauth |
| /api/admin/cv | POST | – | `{ locale: "<code>" }` | `{ result: "LOCALE_INITIALIZED" }` | 400 invalid JSON, 401 |

## Entity CRUD Pattern
Base path: `/api/admin/entity/<entity>` for POST (create/update) and DELETE.

Implemented entities: `skill`, `project`, `experience`, `education`, `certification`, `trait`, `hobby`.

### POST (Create / Update)
- Body: entity schema + `locale`.
- If `id` present -> update; else create.
- 200: `{ result: "UPSERTED", action: "create"|"update" }`.
- 400: validation failure (Zod issues array) / invalid JSON.
- 401: unauthenticated.

### DELETE
- Query: `id`, `locale`.
- 200: `{ result: "DELETED" }` (idempotent – still 200 if row already absent).
- 400: missing params.
- 401: unauthenticated.

## Validation & Error Handling
Zod schemas per entity; JSON parse failure -> `{ error: "INVALID_JSON" }` (400) before schema validation.

## Caching & Invalidation
Successful mutations invalidate per-locale CV aggregate cache key, ensuring fresh subsequent `/api/admin/cv` reads.

## Metrics
- `auth_login_attempts_total{result}`
- `auth_active_sessions`
- `auth_login_backoff_ms`
- `auth_rate_limit_failures_total`
- `cv_entity_mutations_total{entity,action,result}`

## Logging
Structured logs (pino-style) emit events: `domain:admin.<entity>.upsert_success`, `domain:admin.<entity>.validation_failed` including `requestId`, `path`, `action`, and issue counts. Errors include normalized stack.

## Example Workflows
### Login
```bash
curl -i -X POST http://localhost:3000/api/admin/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"secret"}'
```

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
- Session cookie: HttpOnly, SameSite=Lax (Strict optional), Secure in production.
- Exponential backoff + rate limiter reduce brute force risk.
- Planned: MFA, audit log export, stricter CSRF on all mutations.

## Testing Strategy
- Unit tests for login success/failure/backoff, password rotation, logout, me.
- CRUD tests: create, update, delete, validation failure, invalid JSON parsing branch, DB error path (metric `result=error`).
- Harness uses in-memory cookie store & fake clock for renewal threshold scenarios.

## Pending /admin UI (Future)
1. Auth gate + login form.
2. Entity list + CRUD forms.
3. Locale selector; aggregate stats panel.
4. Metrics summary (mutation counts, auth stats).

## Pre-use Checklist
- Set bootstrap admin credentials (env or migration).
- Configure `DATABASE_URL`.
- (Optional) Enable Redis for distributed rate limiting.
- Verify `/api/metrics` exposes auth & mutation metrics after first mutation.

---
Future updates will extend this doc when UI & MFA land.