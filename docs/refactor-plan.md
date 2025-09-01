> Moved: canonical file is `docs/engineering/refactoring/refactor-plan.md`.

# Refactor Plan (Stub)

Legacy copy retained temporarily; update links.

## Buckets

1. Complexity & Readability (S3776, S3358, S6479, S3863, S6759, S6767)
2. Duplication & Magic Numbers (S4325, S2004, S4144)
3. Deprecated / Outdated APIs (S1874)
4. Empty / Placeholder / TODO (S1186, S1135, S2094, S6647, S2871)
5. Param Reassignment & Mutability (S1121, S1763)
6. Accessibility / Semantics (S6479, S6759, S6767)
7. Logging / Tracing Consistency (S4623, S4624)
8. Test Quality & Factory Duplication (S4325, S6647)
9. Type Strictness & Guard Clarity (residual any/unknown, implicit branches)

## Phased Plan

| Phase | Goal | Representative Files | Est. Issues Closed |
|-------|------|----------------------|--------------------|
| 1 | Extract duplicated literals & magic numbers into constants modules | pdf route, cv service, tests | 40–60 |
| 2 | Consolidate test helpers / mocks | `src/tests/**` | 30–50 |
| 3 | Reduce cognitive complexity via helper extraction | `app/cv/page.tsx`, `CvView.tsx` | 25–35 |
| 4 | Update deprecated APIs (Sentry/Next) | `sentry.*.config.ts` | 5–8 |
| 5 | Resolve empty / placeholder / TODO patterns | misc test setup & TODOs | 10–15 |
| 6 | A11y & semantics cleanup | CV UI, navigation | 15–25 |
| 7 | Remove param reassignment & add purity | auth/rate limiter | 8–12 |
| 8 | Logging/tracing helpers unify patterns | logger, tracing, pdf route | 5–10 |
| 9 | Residual types & polish | varied | 6–10 |
| 10 | Verification & gating | CI config | — |

## Automation

Add script `scripts/issue-summary.mjs` to produce a machine-readable breakdown of current lint issues by rule. This is run pre/post phase to measure delta.

## Success Criteria

- All phases produce zero test regressions (unit, integration, e2e, a11y, Lighthouse).
- Issue count steadily decreases; no net new occurrences of already-addressed rules after a phase completes.
- Performance budgets still pass (`npm run build:budgets`).
- Security posture maintained (cookie flags centralized, no new unsafe dynamic imports).

## Working Conventions

- Each phase in its own PR (or grouped small PRs) with checklist in description.
- Extraction refactors (no behavioral change) first; then optional improvements.
- For TODO comments converted into issues: replace with `// NOTE(#issue-id): context`.

## Tracking

Run: `node scripts/issue-summary.mjs > issue-baseline.json` before starting a phase, then again after. Commit updated JSON for audit trail if large reduction.

## Next Action

Phase 1 constant extraction (pdf & CV related) + add issue summary script.

