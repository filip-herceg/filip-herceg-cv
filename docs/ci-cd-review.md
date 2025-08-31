<!--
	CI/CD STRATEGY DOCUMENT (REORGANIZED)
	Purpose: Concise, navigable reference for current state, target architecture, roadmap, and advanced enhancements.
-->

# CI/CD Strategy: Analysis, Target Architecture & Roadmap

Date: 2025-08-31  
Branch: `feature/cv-shortener-and-pdf`

## Table of Contents
1. Executive Summary
2. Current Workflows & Intent
3. Functional Decomposition (Original Responsibilities)
4. Pain Points & Risk Assessment
5. Target Architecture (Workflow Split & Flow)
6. Cross-Cutting Improvements
7. Change Decisions (Add / Modify / Remove)
8. Implementation Plan (Phased)
9. Advanced Enhancements & Extensions
10. KPIs & Governance
11. Quick Wins vs Deep Work
12. Tooling Reference
13. Appendix A: Original Task Matrix

---
## 1. Executive Summary
The legacy monolithic CI workflow bundles quality, security, performance, container, canary, release, and badge publishing into a single YAML file (now `ci.yml.old`) plus a minimal deployment workflow (`cd.yml.old`). This design causes redundant builds, slow feedback, weak least-privilege posture, and limited observability. A modular, risk‑adaptive pipeline with artifact reuse, hardened supply chain measures (signing, SBOM attestations), performance/a11y guardrails, and progressive delivery will increase velocity, reliability, and security while reducing cost.

## 2. Current Workflows & Intent
### 2.1 CI (`ci.yml.old` – corrupted formatting)
Goals: quality gates, security scanning, image build & provenance, UX/perf checks, helm canary (kind), release automation, reporting.

### 2.2 CD (`cd.yml.old`)
Goals: helm deploy latest image to cluster (main), rollback safety, smoke health check, manifest archival.

> Note: `ci.yml.old` includes invalid fencing markers and misplacement of coverage SVG step inside `dependency-review` due to earlier corruption.

## 3. Functional Decomposition (Original Responsibilities)
See Appendix A for granular mapping. High‑level buckets: Quality, Security, Build/Container, Performance & A11y, Deployment Safety, Release, Reporting.

## 4. Pain Points & Risk Assessment
| Domain | Key Issues | Risks | Impact |
|--------|-----------|-------|--------|
| Structure | Monolith, duplicated checkouts | Slow iteration | Higher CI minutes, longer feedback loop |
| Performance | Repeated builds, no artifact reuse, no browser cache | Waste | >2x compute for same result |
| Maintainability | Mixed concerns, custom coverage script | Drift & fragility | Harder updates, brittle parsing |
| Security | Broad implicit permissions, no signing, limited policy | Supply chain exposure | Integrity & provenance weaker |
| Reliability | No timeouts, minimal health validation | Hangs & false green | Uncaught regressions |
| Observability | No trend metrics or thresholds | Regressions slip | Slower detection |
| Deployment | Non-atomic upgrades, manual kubeconfig | Partial rollouts & secrets risk | Longer MTTR |

## 5. Target Architecture (Workflow Split & Flow)
### 5.1 Workflow Set
1. ci-quality.yml – lint, typecheck, unit tests, coverage, static analysis
2. ci-security.yml – dependency review (PR), npm audit, gitleaks, trivy, (optional) CodeQL separate
3. build-and-publish-image.yml – build once, push, SBOM, sign, digest artifact
4. ci-performance.yml – reuse built artifact: Lighthouse, pa11y, Playwright
5. canary-deploy.yml – kind or staging helm install, smoke + synthetic flows
6. release.yml – semantic-release & image retag using captured digest
7. deploy-prod.yml – protected environment, atomic helm upgrade, expanded smoke & rollback

### 5.2 Orchestration Flow (Happy Path)
Push/PR → Quality → (parallel) Security → Image Build (on main after Quality success) → Canary Deploy → Release (tag/version) → Prod Deploy (approval) → Performance (nightly + path-trigger) → Metrics & Badges.

### 5.3 Data / Artifact Reuse
| Artifact | Producer | Consumers |
|----------|----------|-----------|
| build.tgz (.next + cache) | ci-quality | ci-performance |
| coverage.json/svg | ci-quality | badge publishing / PR comment |
| image digest file | build-and-publish | release, canary, prod deploy |
| SBOM (spdx) | build-and-publish | security dashboards |

## 6. Cross-Cutting Improvements
| Area | Improvement | Rationale |
|------|------------|-----------|
| Caching | Lockfile-hash npm cache + Playwright browsers | Reduce repeated downloads |
| Artifacts | Build once, reuse across perf/a11y/e2e | Eliminate rebuild overhead |
| Permissions | Global `contents: read`; escalate per job | Least privilege |
| Timeouts | Defined per job & overall concurrency | Prevent runaway runners |
| Security | cosign signing + provenance (SLSA) | Integrity & traceability |
| Policy | OPA/Conftest on rendered manifests | Enforce k8s guardrails |
| Observability | Metrics branch & PR delta comments | Faster feedback loops |
| Reliability | Helm `--atomic --wait`, synthetic probes | Safer deployments |

## 7. Change Decisions (Add / Modify / Remove)
| Action | Decision | Justification |
|--------|----------|---------------|
| Custom coverage SVG script | Remove | Replace with maintained badge action |
| Combine SBOM+grype+trivy steps | Consolidate post-build | Reduce checkouts & time |
| CodeQL inline | Keep separate workflow | GitHub recommended isolation |
| Duplicate builds | Eliminate | Single build artifact reuse |
| Scheduling | Add weekly security & nightly perf | Continuous assurance |
| Prod deploy gating | Add environment protection | Human approval + audit |
| Image signing | Add cosign & attestation | Supply chain evidence |
| Path filters for heavy jobs | Add | Cost efficiency |
| Composite actions | Introduce for helm validation & scanning | DRY, consistency |

## 8. Implementation Plan (Phased)
| Phase | Focus | Key Deliverables | Success Metric |
|-------|-------|-----------------|----------------|
| 1 | Split + Caching | ci-quality, build artifact, minimal permissions | ≥25% faster feedback |
| 2 | Security Hardening | Signing, SBOM attestations, action pinning | Signed image & SBOM each build |
| 3 | Performance Gates | Lighthouse budgets, pa11y thresholds | Regressions auto-fail |
| 4 | Adaptive Pipeline | Risk-based test selection, flaky quarantine | Reduced heavy job invocations |
| 5 | Progressive Delivery | Canary refinement / GitOps option | Safer releases & rollback speed |
| 6 | Observability | Metrics branch, PR annotations | Faster review decisions |

## 9. Advanced Enhancements & Extensions
### 9.1 Pipeline Intelligence
Risk scoring, selective heavy job execution, test impact analysis, flaky quarantine.

### 9.2 Performance & UX Guardrails
Budgets (LCP/CLS/TBT), Web Vitals synthetic capture, historical trend retention.

### 9.3 Security & Supply Chain
Cosign signing, provenance attestations, license & dependency freshness, multi-scan SARIF merge, action pin rotation policy.

### 9.4 Observability & Feedback
Coverage/perf deltas in PR, metrics JSON to metrics branch, threshold alerts only on state change.

### 9.5 Cost Efficiency
Ephemeral pre-warmed runners, merge queue optimization, tuned artifact retention.

### 9.6 Reliability
Targeted retries, explicit timeouts, richer canary synthetic flows.

### 9.7 Deployment Extensions
Traffic-shifted canaries (Argo Rollouts/Flagger), GitOps promotion PRs, digest propagation chain.

### 9.8 Data & Config Integrity
Drift detection, policy as code, provenance labels.

### 9.9 Developer Experience
Local CI parity script, early precheck, auto-doc sync.

### 9.10 Scalability & Future Proofing
Path filters, reusable actions, feature flag matrix dimension.

## 10. KPIs & Governance
| KPI | Target | Cadence | Owner |
|-----|--------|---------|-------|
| Time to first feedback | <2m | Monthly | Dev Infra |
| Full CI duration (main) | <15m | Monthly | Dev Infra |
| Flaky test % | <1% | Quarterly | QA |
| Critical vulns >7d | 0 | Weekly | Security |
| Lighthouse Performance | ≥90 | Weekly | Web Perf |
| A11y critical issues | 0 | Weekly | Web Perf |
| Signed image ratio | 100% | Continuous | Release Eng |
| Rollback MTTR | <10m | Post-incident | SRE |

## 11. Quick Wins vs Deep Work
| Category | Quick Wins (Days) | Medium (1–2 wks) | Deep (Multi‑wk) |
|----------|-------------------|------------------|----------------|
| Structure | Split quality workflow | Full workflow modularization | Adaptive orchestration engine |
| Security | Permissions hardening | Signing + attestation | Unified SARIF correlation + risk scoring |
| Performance | Build artifact reuse | Budgets + trend storage | Predictive perf regression modeling |
| Reliability | Timeouts & atomic helm | Synthetic user flows | Progressive traffic shifting |
| Observability | Coverage badge action | Metrics branch + PR annotations | Dashboard automation & anomaly detection |

## 12. Tooling Reference
| Need | Suggested Tool/Action |
|------|-----------------------|
| Coverage badge | tj-actions/coverage-badge |
| Image signing | sigstore/cosign-installer |
| Provenance | actions/attest-build-provenance |
| Policy (k8s) | instrumenta/conftest-action |
| Drift | kubectl diff via stefanprodan/kube-tools |
| License scan | license-checker-rseidelsohn |
| Test impact | custom + dorny/paths-filter |
| Flaky detection | custom historical tracker |
| Perf budgets | Lighthouse assert config |

## 13. Appendix A: Original Task Matrix
| Category | Job / Step | Description |
|----------|------------|-------------|
| Linting | yaml-lint | yamllint workflow file |
| Quality | build-test (matrix 18,20) | format:check, lint:ci, typecheck, build, tests+coverage, upload artifacts |
| Coverage | build-test step | Generate coverage badge JSON, artifact upload |
| Static Analysis | static-analysis | hadolint, helm lint, helm template validation, dry-run render |
| Secrets Scan | gitleaks | Scan repo & upload SARIF |
| FS Vulnerabilities | trivy-fs | Trivy filesystem scan (HIGH,CRITICAL) SARIF |
| Dependency Review | dependency-review | PR diff review gate |
| Audit | security-audit | npm audit (fail on critical) |
| Code Scanning | codeql | Init, autobuild, analyze JavaScript |
| Performance | lighthouse | LHCI autorun |
| Accessibility | a11y | pa11y-ci + screenshots |
| E2E | e2e | Playwright tests |
| Container Build | docker | Image build & push + digest |
| Supply Chain | supply-chain | SBOM + grype scan |
| Ephemeral Deploy | canary-kind | kind helm install & rollout |
| Release Automation | release | semantic-release + retag |
| Reporting | summary | Aggregate job statuses |
| Coverage Badge Publish | coverage-badge-publish | Generate & push badge |
| Deployment (CD) | deploy | Helm upgrade + smoke + rollback |

---
Prepared by: Automated analysis (GitHub Copilot)

Extended optimization + reorganization complete.
