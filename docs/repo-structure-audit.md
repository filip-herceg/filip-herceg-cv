# Repository structure audit and cleanup plan

Date: 2025-09-07
Branch reviewed: feature/cv-shortener-and-pdf

This document summarizes issues found in the repository layout and proposes a concrete plan to organize files, reduce root clutter, and standardize outputs and configs. It focuses on practical changes that won’t disrupt day-to-day development.

---

## Executive summary

Top issues observed:
- Root folder is cluttered with many JSON reports and several SQLite DB files.
- Multiple single‑purpose config and output files are mixed together; some appear duplicated or temporary.
- Test/result artifacts live at the root (and in a few ad-hoc folders), making discovery and cleanup hard.
- There are overlapping places for types (both `src/types/` and root `types/`).
- Infrastructure manifests exist in both `helm/` and `k8s/` without a clear single source of truth.
- Scripts are all in `scripts/` without categorization; several generate outputs into root.

High‑level recommendations:
- Introduce a `/reports/` (or `/artifacts/`) top-level folder for all generated diagnostics: lint, a11y, Lighthouse, test results, docs indices, etc.
- Move persistent sample/test databases under `tests/fixtures/` (or `prisma/fixtures/`) and ignore transient DBs.
- Consolidate type definitions either in `src/types/` or keep root `types/` only for global ambient types with clear ownership.
- Standardize on one deployment approach (Helm or raw K8s). If both are needed, define the relationship and generation flow.
- Add/adjust `.gitignore` to keep generated/transient files out of Git.

---

## Current layout (simplified)

- Application code: `src/` (Next.js app router) with `app/`, `components/`, `lib/`, `tests/`, `types/`
- Styling: `styles/`, `public/`
- Tooling/config: `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `lighthouserc.json`, `.lighthouseci/`, `.pa11yci.json` and `pa11yci.json`
- Infrastructure: `helm/` (chart), `k8s/base/` (manifests)
- Database: `prisma/` (schema + migrations) and multiple `*.sqlite` at repo root; `prisma/test.db`
- Scripts: `scripts/*.mjs|*.ps1`
- Reports/artifacts: `coverage/`, `test-results/`, `verbose/coverage/`, many `eslint-*.json`, `eslint-debug.log`, `docs-index.json`, `budget-report.json`, `full_lint.json`, etc. in root

---

## Problems and targeted fixes

### 1) Root clutter: reports and temporary files in `/`

Observed examples:
- JSON reports: `eslint-*.json`, `eslint-report.json`, `eslint-full.json`, `eslint-otel.json`, `full_lint.json`, `lint_full.json`, `lint_service.json`, `full2.json`, `flakey.json`, `docs-index.json`, `budget-report.json`, `eslint_route.json`, `single_ambient_lint.json`, `single_service_lint.json`, `single_storage_lint.json`, `.eslint_tmp.json`
- Logs: `eslint-debug.log`
- Test artifacts: `test-results/`, `coverage/`, `verbose/coverage/`

Issues:
- Mixed, hard-to-scan root.
- Inconsistent naming and location make cleanup/CI artifact collection brittle.

Fix:
- Create a single top-level `reports/` directory with subfolders per tool:
  - `reports/lint/` for all ESLint JSON and logs
  - `reports/tests/` for `test-results/` (or move the folder inside)
  - `reports/coverage/` for `coverage/` (or keep default `coverage/` and symlink/copy on CI)
  - `reports/a11y/` for Pa11y outputs
  - `reports/lighthouse/` for LHCI outputs
  - `reports/docs/` for docs indices like `docs-index.json`
  - `reports/budgets/` for `budget-report.json`
- Update scripts to write outputs to these locations (see "Script updates" below).
- Add `.gitignore` entries to exclude generated reports broadly (see below).

Suggested mapping:
- `eslint-*.json`, `eslint-debug.log`, `full_lint.json`, `lint_full.json`, `lint_service.json`, `single_*_lint.json`, `full2.json`, `eslint_route.json` → `reports/lint/`
- `docs-index.json` → `reports/docs/`
- `budget-report.json` → `reports/budgets/`
- `test-results/` → `reports/tests/`
- `coverage/` (optionally) → `reports/coverage/` (or keep `coverage/` at root if preferred by tooling; ensure it’s gitignored)
- `verbose/coverage/` → remove or move to `reports/coverage/verbose/` if still useful


### 2) Duplicate or conflicting configs

Observed:
- Both `.pa11yci.json` and `pa11yci.json` exist. Tools typically expect `.pa11yci.json` in root.
- ESLint has `eslint.config.mjs` (flat config) and also `.eslintrc.json` present. Keeping both can be confusing.
- Lighthouse has `lighthouserc.json` and `.lighthouseci/` directory; ensure one authoritative config path.

Fix:
- Keep a single Pa11y config: recommend `.pa11yci.json`. Remove `pa11yci.json`.
- Choose one ESLint configuration style. If using flat config (`eslint.config.mjs`), remove `.eslintrc.json` unless intentionally needed for a specific tool (then document why).
- Keep `lighthouserc.json` at root or move it inside `.lighthouseci/` consistently. Document the chosen path in `README.md`.


### 3) SQLite databases in root

Observed:
- `test-admin-*.sqlite`, `test-cv*.sqlite`, and `test-cv.sqlite` at repo root; also `prisma/test.db`.

Issues:
- Mixes binaries with source; increases repo noise and risk of accidental edits/commits.
- Hard to understand which DBs are fixtures vs transient.

Fix options (pick one):
- Preferred: generate test DBs during test setup. Keep only seeds/migrations in Git. Ignore `*.sqlite` in `.gitignore`.
- If committing sample DBs is necessary, move them into `tests/fixtures/db/` (or `prisma/fixtures/`) and document their purpose and how tests reference them.
- Consider using the existing migration script `scripts/migrate-sqlite-to-postgres.mjs` to move off SQLite for CI consistency.


### 4) Types spread across `types/` and `src/types/`

Observed:
- `types/` at repo root and `src/types/`.

Issues:
- Unclear ownership; risk of duplicate or conflicting types.

Fix:
- Consolidate to one of the following patterns:
  - Keep everything in `src/types/` for app-internal types; reserve root `types/` only for global ambient declarations (e.g., `*.d.ts` that augment Node/JSX). Update `tsconfig.json` `typeRoots`/`paths` accordingly.
  - Or move all custom types to `src/types/` and remove root `types/` entirely if not needed for ambient types.


### 5) Infrastructure duplication: `helm/` and `k8s/`

Observed:
- `helm/` chart plus `k8s/base/` raw manifests.

Issues:
- Two sources of truth for the same deployment concerns can drift.

Fix strategies:
- Strategy A (Helm-first): Keep `helm/` as the source of truth. Remove `k8s/base/` or regenerate it from Helm when needed using a task (e.g., `helm template` into `k8s/base/`), clearly documenting that `k8s/base/` is generated and should not be edited by hand.
- Strategy B (Raw Kustomize-first): Keep `k8s/` as the source of truth. Remove Helm or use Helm only for local templating, but not committed.

Pick one and document the flow in `docs/operations/platform/deploy.md`.


### 6) Scripts organization and outputs

Observed:
- `scripts/` contains docs, lint, migration, and test runners in one flat folder.
- Several scripts likely write outputs into the repo root by default.

Fix:
- Group scripts by domain, e.g.:
  - `scripts/ci/` for CI utilities (`lint-diagnostics.mjs`, `issue-summary.mjs`, etc.)
  - `scripts/docs/` for docs utilities (`docs-generate-index.mjs`, `docs-link-check.mjs`, etc.)
  - `scripts/dev/` for local tasks
  - `scripts/migrations/` for database/data migrations
- Update scripts to respect an environment variable for output base, defaulting to `reports/`. For example:
  - `const outDir = process.env.REPORTS_DIR ?? 'reports';`
  - Then write files under `${outDir}/lint/…`, `${outDir}/docs/…`, etc.


### 7) Git hygiene: ignore build caches and build-info

Observed:
- `tsconfig.tsbuildinfo` is present (often generated and ignored in most repos).

Fix:
- Add to `.gitignore` unless you intentionally commit it:
  - `tsconfig.tsbuildinfo`
  - `reports/`
  - `coverage/`
  - `test-results/` (or `reports/tests/`)
  - `*.sqlite` (if DBs are generated)
  - `.eslint_tmp.json`
  - `.next/`
  - `verbose/`

---

## Proposed target structure (illustrative)

```
/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  ├─ tests/
│  └─ types/                # consolidate app types here
│
├─ types/                    # optional: ambient/global .d.ts only
│
├─ prisma/
│  ├─ migrations/
│  ├─ schema.prisma
│  └─ fixtures/              # optional: committed sample DBs or SQL seeds (if needed)
│
├─ reports/
│  ├─ lint/
│  ├─ tests/                 # or move current test-results here
│  ├─ coverage/              # optional; alternatively keep at /coverage
│  ├─ a11y/
│  ├─ lighthouse/
│  ├─ docs/
│  └─ budgets/
│
├─ scripts/
│  ├─ ci/
│  ├─ docs/
│  ├─ dev/
│  └─ migrations/
│
├─ docs/
│  ├─ ... (existing)
│  └─ repo-structure-audit.md
│
├─ helm/                     # OR k8s/ as single source of truth
└─ k8s/
```

# Defaults and decisions (second pass)

To unblock work without waiting on choices, here are sensible defaults you can adjust later:

## Concrete .gitignore entries

Add or verify these patterns (dedupe if already present):

```
# Build/cache
.next/
tsconfig.tsbuildinfo

# Reports & artifacts
reports/
coverage/
test-results/
verbose/
*.log
.eslint_tmp.json

# Databases (generated in tests/dev)
*.sqlite
prisma/test.db

# LHCI/Pa11y outputs (if not under reports)
.lighthouseci/.lhr*
.lighthouseci/*-report.json
pa11y*.json
```

## Artifact conventions and naming

- Base directory: `REPORTS_DIR` environment variable; default to `reports/`.
- Lint: `reports/lint/eslint-report.json` (or timestamped: `eslint-YYYYMMDD-HHmm.json` when running locally).
- A11y: `reports/a11y/pa11y-report.json`.
- Lighthouse (LHCI): `reports/lighthouse/<route>/manifest.json` and HTML reports per run.
- Docs: `reports/docs/docs-index.json`.
- Budgets: `reports/budgets/budget-report.json`.
- Tests: keep `coverage/` at root; move any `test-results/` into `reports/tests/` or configure the test runner to write there.

---

## Script and task updates (examples)
Windows note: prefer copying instead of symlinks in CI to avoid permissions issues on Windows runners.

## Migration playbook (step-by-step)

Run locally in a fresh branch to validate safely:

1) Prepare
- Ensure CI green on current main branch for a baseline.
- Create branch: `feat/repo-structure-cleanup`.

2) Hygiene
- Update `.gitignore` with rules above.
- Remove `pa11yci.json` (keep `.pa11yci.json`).
- Remove `.eslintrc.json` if flat config is authoritative; document if you must keep it.

3) Reports directory
- Create `reports/` with subfolders: `lint/`, `a11y/`, `lighthouse/`, `docs/`, `budgets/`, `tests/`.
- Move existing root JSON/log artifacts into the appropriate subfolder (non-breaking).

4) Script outputs
- Update scripts under `scripts/` to honor `process.env.REPORTS_DIR ?? 'reports'` and write into the corresponding subfolder.
- For tools that don’t support output paths via CLI, add a small wrapper script.

5) Databases
- Decide: ignore all `*.sqlite` or move required fixtures to `tests/fixtures/db/` (and update references).

6) Types
- Consolidate under `src/types/`. Move ambient global augmentations, if any, to root `types/` or co-locate under `src/types/ambient/` and configure `tsconfig`.

7) Infra
- Adopt Helm-first. Add a task/README snippet to regenerate `k8s/base/` with `helm template` if you still want committed manifests. Mark them as generated.

8) Checks
- Run: Lint, Typecheck, Unit+Integration tests, E2E, Lighthouse, A11y. Fix any path regressions.

9) CI
- Update CI to collect artifacts from `reports/**` (and `coverage/**`).

10) Review and merge
- Open PR with a summary referencing this document; include a short diff of moves and script changes.

Rollback strategy: This is all file moves and config changes—use Git to revert the branch if any step causes issues.

---
## Acceptance criteria

- Root directory is free of ad-hoc JSON reports, logs, and transient DBs (except coverage/ if kept by design).
- Only one config per tool is present and documented (ESLint flat config, `.pa11yci.json`, a single LHCI config path).
- Scripts consistently write to `reports/` (or default locations explicitly documented).
- Tests, lint, typecheck, and E2E pass locally and in CI after the moves.
- Infra source of truth and generation flow are documented; manifests render or deploy successfully.

## Risks and mitigations

- Tools expecting old output paths: mitigate by adding a copy step or reading `REPORTS_DIR` with sensible defaults.
- Windows symlink permissions: avoid symlinks; prefer copies.
- Third-party GH Actions or dashboards consuming old paths: update paths and keep a short transitional copy to avoid breaking dashboards.

- ESLint (JSON output to reports):
  - `eslint . -f json -o reports/lint/eslint-report.json`
- Pa11y:
  - `pa11y-ci --json > reports/a11y/pa11y-report.json`
- Lighthouse (LHCI):
  - Configure LHCI to export results into `reports/lighthouse/`
- Docs index:
  - Update `scripts/docs-generate-index.mjs` to write `reports/docs/docs-index.json` (keep a symlink or copy if some consumers expect the old path).

Add a single env var to control locations (defaulting to `reports/`), e.g. `REPORTS_DIR=reports`, and use it across scripts.

---

## CI/CD considerations

- Update CI artifacts collection to pick up `reports/**` and/or `coverage/**`.
- If you switch to Helm-as-source, add a CI step `helm template` to ensure manifests render successfully.
- Consider failing CI if unexpected files appear in root (simple script that checks for non-whitelisted patterns).

---

## Phased migration plan

1) Housekeeping (low risk)
- Add/adjust `.gitignore` to exclude transient artifacts and build caches.
- Remove duplicated configs (e.g., `pa11yci.json` if `.pa11yci.json` is used).

2) Reports consolidation
- Create `reports/` subfolders and update scripts to write there.
- Move existing JSON/log outputs accordingly.

3) DB hygiene
- Decide on SQLite policy. Either generate on the fly (ignore all) or move committed samples to `tests/fixtures/db/` (or `prisma/fixtures/`).

4) Types consolidation
- Pick `src/types/` as primary; move or delete root `types/` accordingly. Update `tsconfig.json`.

5) Infrastructure single source of truth
- Pick Helm or K8s as authoritative.
- Document the chosen workflow and cleanup the other if redundant.

6) Scripts organization
- Split scripts by domain and adopt `REPORTS_DIR` convention.

---

## Quick checklist

- [ ] Add `.gitignore` rules for reports, coverage, transient DBs, caches
- [ ] Remove duplicate configs (`pa11yci.json` vs `.pa11yci.json`, ESLint config duplication)
- [ ] Create `reports/` dirs and redirect outputs
- [ ] Move or ignore SQLite DBs; document how tests get data
- [ ] Consolidate types into `src/types/` (with optional ambient root `types/`)
- [ ] Choose Helm or K8s as the source of truth and document it
- [ ] Reorganize `scripts/` into subfolders and standardize outputs
- [ ] Update CI to collect artifacts from `reports/**`

---

## Notes

- Keep `components.json` at root if it is used by tooling (e.g., shadcn); do not move it unless the tool supports custom paths.
- Keeping `coverage/` at root is common; moving it under `reports/` is optional. The important part is consistent artifact collection and ignoring it in Git.
- If some tools hardcode output paths, prefer changing them in config rather than moving files post-factum.
