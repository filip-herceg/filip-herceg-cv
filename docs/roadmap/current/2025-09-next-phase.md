---
title: Phase 4 – Types consolidation, DB policy, infra workflow
status: completed
category: engineering
---

Scope (updated):
- Types: consolidate app types under `src/types/` and keep root `types/` only for ambient `.d.ts` (review two files in `types/`). Update `tsconfig.json` if needed.
- SQLite policy: ephemeral DBs under `src/tests/fixtures/db/tmp/` and documented.
- Infra: document Helm-first workflow and (optionally) add a `helm template` task that regenerates `k8s/base/` and tags those files as generated.

Quality gates:
- Root hygiene guard enforced in CI (no ad-hoc root artifacts).
- Lint/Typecheck/Test green.

Deliverables:
- Updated `tsconfig.json` and moved types. (Done)
- Legacy `types/` marked deprecated; de-duped files replaced with no-op and notes. (Done)
- Docs: short note under `docs/operations/platform/deploy.md` clarifying Helm → k8s generation.
- Test DB fixtures README and runbook added. (Done)

For current product roadmap status, see `docs/roadmap/current/2025-09-phase-2-roadmap.md`.
