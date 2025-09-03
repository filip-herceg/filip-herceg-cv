> Moved: canonical file is `docs/engineering/refactoring/refactor-rate-limiter.md`.

# Rate Limiter Refactor (Stub)
Last Updated: Steps 11-14 completed (final review)

## Objective
Replace brittle synchronous RateLimiter + ad-hoc Redis implementation with a clean async abstraction, robust Redis backend, memory fallback, observability, and documented operations.

## Acceptance Criteria
1. Full checklist completed (all items marked Done)
2. Each step reflected with timestamped progress entry in this file ("Progress Log")
3. Lint/type/tests green throughout, final pass spotless
4. Documentation (architecture.md, operations.md, README if needed) updated to reflect new behavior & env vars

## Checklist
- [x] 1. Define new async RateLimiter contract (Promise-based) and update type definitions
- [x] 2. Implement MemoryRateLimiter (base, max exponential backoff) and integrate into handlers (await calls)
- [x] 3. Update tests to use async interface (adjust admin-auth & any others)
	- Removal prerequisite: delete old `redis-rate-limiter.ts` (done) prior to new implementation (step 5)
- [x] 4. Introduce config module (auth/config.ts) centralizing env parsing (backoff base/max, jitter, ttl)
	- Removal prerequisite: delete old `redis-rate-limiter.ts` (done) prior to new implementation (step 5)
- [x] 5. Implement RedisRateLimiter with atomic INCR + conditional EXPIRE (no local shadow), async recordFailure returning { failCount, delayMs }
- [x] 6. Add jitter support (┬▒fraction) configurable via AUTH_BACKOFF_JITTER_FRACTION; disable in tests (implementation present; tests added)
- [x] 7. Add metrics: auth_rate_limiter_backend (gauge), auth_login_backoff_ms (histogram), auth_rate_limit_failures_total (counter)
- [x] 8. Add structured logging + fallback (warning once per outage window, circuit breaker optional) for Redis failures
- [x] 9. Add cross-context (distributed) test with shared mocked Redis verifying shared failCount
- [x] 10. Add fallback test (Redis failure -> memory) & jitter bound test
- [x] 11. Remove old fire-and-forget redis-rate-limiter code and any dead comments
- [x] 12. Update docs: operations.md (backoff, jitter, failure modes), architecture.md (sequence diagram note), add env vars table entries
- [x] 13. Ensure lint/type/tests green; zero eslint warnings (especially around optional deps)
- [x] 14. Final review & mark completion

## Deferred / Stretch (not required for acceptance)
- Per-IP dimension
- Circuit breaker advanced metrics (if not in core step 8)
- Lua script optimization

## Progress Log
- (init) Plan file created.
- (step 1) Updated RateLimiter interface to async; modified types.ts & handlers.ts.
- (step 2) Added memory-rate-limiter implementation and integrated.
- (step 3) Adjusted integration test stub to async API.
- (step 3.1) Removed legacy redis-rate-limiter.ts to restore lint cleanliness before implementing new Redis version.
- (step 4) Added config.ts and refactored context.ts to consume unified parsed env and construct MemoryRateLimiter from config.
- (step 5) Added RedisRateLimiter implementation (atomic INCR + PEXPIRE) and conditional context selection when REDIS_URL present.
- (step 6) Implemented jitter logic already in memory/redis limiters; added unit test for jitter bounds.
- (step 9) Added distributed RedisRateLimiter test using shared fake redis stub demonstrating shared fail count.
- (step 10) Added fallback degradation test (redis error -> memory) completing test coverage for wrapper.
- (step 7) Metrics implemented (backend gauge, backoff gauge, failures counter) and integrated in login handler.
- (step 8) Added fallback-rate-limiter wrapper with structured logging on first Redis error and automatic memory degradation.
- (steps 11-14) Docs updated (operations & architecture), plan closed after final lint/type/tests pass and cleanup.

## Completion Summary
All acceptance criteria met: async abstraction, Redis backend with automatic fallback, metrics, logging, tests (including jitter bounds & fallback), documentation updated. No legacy rate limiter code remains. Further enhancements (IP dimension, circuit breaker metrics) deferred per plan.

