## (Merged ci-cd + review)
\n<!-- Source: docs/engineering/ci-cd.md -->\n
---
title: CI/CD Pipeline & Strategy
category: engineering
status: active
lastUpdated: 2025-09-02
canonical: docs/engineering/ci-cd.md
---
<!-- Sources: formerly docs/cicd.md and docs/ci-cd-review.md -->
# CI/CD Pipeline & Strategy

## Goals
Fast, reliable, secure delivery with clear quality gates, supply chain integrity, and progressive deployment safety.

## Workflow Set (Target Architecture)
| Workflow | Purpose |
|----------|---------|
| ci-quality | Lint, typecheck, unit/integration tests, coverage artifact |
| ci-security | Dependency review, npm audit, gitleaks, trivy fs/image, CodeQL (separate) |
| build-and-publish-image | Single image build, SBOM, sign, push, digest artifact |
| ci-performance | Lighthouse, pa11y, Playwright E2E using built image/static export |
| canary-deploy | Helm deploy to staging/kind, smoke + synthetic flows |
| release | Semantic versioning + image retag + changelog + provenance attestations |
| deploy-prod | Protected environment, `helm upgrade --atomic --wait`, rollback plan |

## Current State (Interim)
Legacy combined steps exist; migration phasing increments toward split model. See Implementation Plan.

## Quality Gates
| Gate | Threshold | Notes |
|------|-----------|-------|
| Lint | 0 warnings (CI) | Local dev may allow warnings |
| TypeScript | No errors | `tsc --noEmit` |
| Coverage Statements | >=95% | Current ~96.7% |
| Coverage Branches | >=80% | Current ~84% |
| Coverage Functions | >=85% | Current ~89% |
| Coverage Lines | >=95% | Current ~96.7% |
| Accessibility | 0 critical pa11y issues | Warn on minor |
| Lighthouse Perf | >=90 | Fail below (future assert) |
| Lighthouse A11y | >=95 | |

## Container & Supply Chain
Steps (planned in build workflow):
1. Build (standalone output) -> image
2. SBOM (cyclonedx or syft) export -> artifact
3. Security scan (grype/trivy image) -> SARIF
4. Sign image + produce provenance attestation (cosign + attest-build-provenance)
5. Publish digest artifact (for deploy & release workflows)

## Performance & A11y
Executed post-build to avoid duplicate compilation. Use `paths-filter` to skip when no UI-impacting changes.

## Artifact Reuse
| Artifact | Producer | Consumers |
|----------|----------|-----------|
| build.tgz (.next output) | ci-quality | ci-performance (Lighthouse, pa11y) |
| coverage.* | ci-quality | Coverage badge / PR comment |
| image digest | build-and-publish-image | canary, release, deploy-prod |
| SBOM (spdx/json) | build-and-publish-image | security dashboards, attestation |

## Implementation Plan
| Phase | Focus | Deliverables |
|-------|-------|-------------|
| 1 | Split quality + build | ci-quality.yml, build workflow, artifact reuse |
| 2 | Security hardening | ci-security.yml, SBOM + signing, action pinning |
| 3 | Perf & A11y gating | ci-performance.yml with budgets/asserts |
| 4 | Adaptive pipeline | paths-filter, flaky quarantine, risk scoring |
| 5 | Progressive delivery | canary-deploy.yml, deploy-prod.yml with approvals |
| 6 | Observability | Metrics on pipeline duration, PR annotations, badges |

## Change Decisions Summary
Remove custom coverage badge script (use maintained action); add signing & provenance; enforce least-privilege permissions per job; consolidate scans post-build; introduce path-based selective execution.

## Future Enhancements
- Visual regression (Playwright snapshots)
- Tracing integration test gates (OpenTelemetry collector in canary)
- Policy as code (Conftest) on rendered Helm + Kubernetes manifests
- Drift detection (kubectl diff) in deploy workflows
- Release health metrics & rollback auto trigger (error budget based)

## Failure Triage Order
1. Lint/Type errors -> fix quickly for fast re-run
2. Unit test regressions -> inspect diff & run isolated test
3. E2E flake -> re-run with trace/video; quarantine if flaky >2x
4. Lighthouse drop -> check bundle diff & network waterfall
5. Security scan fail -> attempt upgrade; otherwise justify & suppress with expiry
6. Deployment failure -> inspect helm diff, pod describe/logs, rollback

## Rollback Strategy
`helm rollback <release> <revision>` with image digest mapping kept in release notes. Maintain previous two digests for quick pin.

## KPIs
| KPI | Target |
|-----|--------|
| Time to first feedback | <2m |
| Full CI (quality + build) | <10m |
| Signed image ratio | 100% |
| Flaky tests | <1% |
| Mean rollback time | <10m |

## Security & Integrity Roadmap
- Enforce action pinning (SHA) & renovate automation
- Cosign keyless signing (Fulcio) + Rekor transparency log
- SLSA provenance v1 attestation
- License scanning + policy gate

## Local Reproduction
```bash
npm run lint:ci
npm run typecheck
npm test
npm run build
```
Optional heavy checks:
```bash
npm run e2e
npx pa11y-ci
npm run lhci
```

## Appendix: Original Pain Points (Condensed)
Monolithic workflow, duplicate builds, broad permissions, lack of artifact reuse, missing signing/SBOM, weak perf/a11y gating, minimal rollback safety.

---
Canonical consolidated reference; deep historical analysis retained in version control history.
\n<!-- Source: docs/ci-cd-review.md -->\n
> This strategy document merged into `docs/engineering/ci-cd.md`.

# CI/CD Strategy (Moved)

Historical deep-dive preserved in version control; canonical reference now consolidated. Update links; stub removed after Phase 5.
