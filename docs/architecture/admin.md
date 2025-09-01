---
title: Admin Architecture
category: architecture
status: active
lastUpdated: 2025-09-02
canonical: docs/architecture/admin.md
---
<!-- Source: formerly docs/admin.md -->

> TODO: Add sequence diagram (login -> session -> CRUD), rate limiter interaction, and security checklist.

## Overview
Thin architectural layer splitting HTTP (route handlers) from domain services (auth, rate limiting, session, CV aggregate read). Emphasis: pure functions & explicit dependencies for testability.

## Sequence (Login)
```
client -> /api/admin/login
	parse JSON -> validate -> rateLimiter.recordFailure?/reset
	verify password (bcrypt)
	create session (secure, httpOnly cookie)
	emit metrics + structured log
	return 200
```

## Components
| Component | Responsibility |
|-----------|----------------|
| AuthService | Credential verify, password change, session issuance/rotation |
| SessionStore | In‑memory map (future Redis) keyed by session id -> metadata |
| RateLimiter (memory/redis) | Backoff & failure counting |
| CSRF module | Double submit token generation & validation |

## Security Checklist
- [x] HttpOnly, Secure, SameSite=Lax cookie
- [x] Password hashing (bcrypt)
- [x] Rate limiting + exponential backoff + jitter
- [x] CSRF token for password change
- [ ] Session persistence across restart (future Redis)
- [ ] WebAuthn / MFA (future)

## Observability
Metrics: `auth_login_attempts_total`, `auth_rate_limiter_backend`, `auth_rate_limit_failures_total`, `auth_login_backoff_ms`.
Structured logs include `event`, `requestId`, `username?(hashed)`, and outcome.

## TODO
- Add session idle timeout & rotation cadence doc
- Add architecture diagram (Mermaid) for request -> handler -> service -> store
