# Task 6: Performance & Accessibility Budgets

Status: Task 6 of 7 (Schema ✅ · Taxonomy ✅ · Search ✅ · Permalink ✅ · Export Matrix ✅ · Perf/A11y Budgets ⏳ · Logging & Privacy →)

## 1. Objectives
Establish measurable budgets and automated enforcement for:
- Lighthouse category scores (already partially enforced via `lighthouserc.json`).
- Core Web Vitals proxies in CI (LCP, TBT, CLS thresholds already asserted; extend with FCP + Speed Index soft targets).
- JavaScript payload (initial route) compressed size.
- Image asset weight & format best practice (max single image, total images).
- Accessibility: Zero critical issues (pa11y) + axe rule subset; maintain ≥95 Accessibility score.
- Regression visibility: Fail fast on significant deltas > defined tolerance vs last baseline.

## 2. Budgets (Initial)
| Aspect | Metric | Budget | Enforcement | Notes |
|--------|--------|--------|------------|-------|
| Performance | Lighthouse Performance | >=0.97 | LHCI assert | Existing
| Performance | LCP (ms) | <=2200 | LHCI assert | Existing
| Performance | Total Blocking Time (ms) | <=150 | LHCI assert | Existing
| Performance | Cumulative Layout Shift | <=0.08 | LHCI assert | Existing
| Performance | First Contentful Paint (ms) | <=1600 | LHCI (warn) | New
| Performance | Speed Index (ms) | <=2200 | LHCI (warn) | New
| Payload | JS (initial, gz) | <=180KB | custom script (error) | From vision-mission
| Payload | Largest single JS chunk (gz) | <=90KB | custom (warn) | New
| Payload | Total images (home) | <=6 | custom (warn) | New
| Payload | Largest image (kb, optimized) | <=120KB | custom (error) | New
| A11y | Lighthouse Accessibility | >=0.95 | LHCI assert | Existing
| A11y | Pa11y critical issues | 0 | pa11y-ci | New
| A11y | Color contrast violations | 0 | pa11y-ci | New
| Regression | Perf score delta | -0.02 max drop | compare previous artifact | Future (optional)

## 3. Tooling Plan
1. Lighthouse CI (already configured): Add additional warn-level assertions for FCP & Speed Index.
2. pa11y-ci: Add a `pa11yci.json` with target pages (`/`, `/cv`, `/projects`, `/contact`). Integrate npm script & VS Code task (already present A11y task using `npx pa11y-ci`). Ensure thresholds (fail on any serious/critical).
3. Bundle size script: After `next build` inspect `.next/static/chunks/*.js` + app build output; compute gzip sizes. Fail if budgets exceeded. Provide JSON report for future trend tracking.
4. Image audit: During bundle script, scan `public/` images for size & format; skip SVGs for weight budget; enforce largest raster file size.
5. Integrate into CI aggregate script (extend existing "CI: lint+typecheck+build+test" or add new script invoked separately to not slow core cycle unless on main or PR).

## 4. Implementation Steps
- Create `pa11yci.json` configuration.
- Add npm scripts: `test:a11y`, `test:perf:bundle`, `ci:quality` (runs lint, typecheck, test, bundle budget, optionally lhci if build available or behind env flag).
- Implement `scripts/check-budgets.mjs` for JS & image budgets.
- Update docs (`cicd.md`) with new section.
- (Optional later) Persist previous LHCI JSON to compare deltas.

## 5. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Flaky Lighthouse metrics in CI | False negatives | Use staticDistDir & only assert stable metrics; optional warn for volatile ones |
| New dependency overhead | Longer pipeline | Keep custom script pure Node, no heavy deps |
| Internationalization or future pages not covered by a11y scan | Hidden regressions | Document adding new routes to pa11y config |

## 6. Acceptance Criteria
- Failing budgets produce non-zero exit code in CI.
- Docs list current budgets & how to adjust.
- All current pages pass budgets at implementation time.
- Coverage remains ≥80% branches after new scripts (scripts excluded from coverage by default).

## 7. Follow-ups (Post-Task 6)
- Add regression delta comparison (store last JSON results artifact).
- Integrate WebPageTest or CrUX API for field data (stretch).

---
Status: Draft ⏳ (not yet enforced).
