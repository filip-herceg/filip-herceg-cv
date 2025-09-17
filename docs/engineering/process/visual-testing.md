---
title: Visual Testing & Baselines
category: engineering
status: stable
---

# Visual Testing & Baselines

- Baselines live next to specs (e.g., `src/tests/e2e/print-fidelity.spec.ts-snapshots/`).
- Two key snapshots are validated:
  - `cv-print-a4.png` (A4 normal density)
  - `cv-print-letter-compact.png` (Letter compact density)

## Update / Create Baselines (local)

1) Enable export mode and run E2E:

```bash
EXPORT_PRINT_DIFF=1 npm run e2e
```

2) Commit updated baselines under the spec `-snapshots/` folder.

## Per‑snapshot Threshold Overrides

Configure exceptions in `src/tests/e2e/visual-thresholds.json`:

```json
{ "cv-print-letter-compact.png": { "maxDiffPixelRatio": 0.025 } }
```

## CI Guards & Reports

- Baseline presence is checked in CI: `npm run test:visual:verify`.
- A variance scaffold is generated: `npm run test:visual:variance` → `reports/tests/visual-variance/`.
