# Phased ESM Migration Plan (S06)

Goal: Safely migrate to native ESM (or stable hybrid) without destabilizing builds/tests.

## Principles
1. Incremental & reversible steps.
2. Convert leaf utilities first.
3. Maintain CJS interop for prom-client & any CJS-only deps.
4. CI green & coverage unchanged each step.

## Phases
| Phase | Action | Exit Criteria |
|-------|--------|---------------|
| 0 | Document plan & rollback (this file) | Plan reviewed |
| 1 | Add exports map (no behavior change) | No resolution regressions |
| 2 | Convert leaf utils (pure functions) | No runtime changes |
| 3 | Convert observability/cache modules | Metrics unchanged |
| 4 | Gradually convert API routes | PDF + metrics routes function |
| 5 | Switch tsconfig module to nodenext (optional) | All imports resolve; tests pass |
| 6 | Remove legacy requires & add lint rule | New requires blocked |

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| CJS dependency breakage | Keep hybrid config; avoid setting package "type" early |
| Test runner issues | Trial nodenext in branch; fallback quickly |
| Tool perf regression | Measure build time before/after flip |

## Rollback
Revert tsconfig + exports map; clear build cache; no code rewrites needed.

---
Referenced by roadmap S06 (Done).
