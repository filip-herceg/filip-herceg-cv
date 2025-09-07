---
title: Phase 4 – Types consolidation, DB policy, infra workflow
status: planned
category: engineering
---

Scope:
- Types: consolidate app types under `src/types/` and keep root `types/` only for ambient `.d.ts` (review two files in `types/`). Update `tsconfig.json` if needed.
- SQLite policy: either fully ignore ephemeral DBs (generate during tests) or move required fixtures to `tests/fixtures/db/` and document referencing.
- Infra: document Helm-first workflow and (optionally) add a `helm template` task that regenerates `k8s/base/` and tags those files as generated.

Quality gates:
- Root hygiene guard enforced in CI (no ad-hoc root artifacts).
- Lint/Typecheck/Test green.

Deliverables:
- Updated `tsconfig.json` and moved types.
- Docs: short note under `docs/operations/platform/deploy.md` clarifying Helm → k8s generation.
- If fixtures needed: `tests/fixtures/db/` with README.
