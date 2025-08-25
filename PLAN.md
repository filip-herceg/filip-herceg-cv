# CV Integration Plan (CV Full + Short Mode + PDF Export)

## 1. Scope & Objectives
Add a CV rendering subsystem that delivers:
- `/cv` full CV page.
- `/cv?mode=short` short builder (interactive selection of skills & projects).
- `/cv/print` print‑optimized mirror (no editor chrome) – same layout semantics.
- `/api/cv/pdf` server PDF (Chromium + Puppeteer) that renders the print page with query params and streams an A4 PDF.
All without breaking existing routes / build / tests / lint.

## 2. Current Stack Discovery
| Aspect | Findings |
|--------|----------|
| Framework | Next.js 14.2.31 (App Router present: `src/app`) |
| Rendering | React 18, strict mode on |
| Output | Standalone build configured (`output: 'standalone'`) – good for Puppeteer binary reuse |
| Styling | Tailwind CSS ^4 (next major / preview) + `tailwindcss-animate` plugin |
| Type System | TypeScript strict = true, moduleResolution bundler, path alias `@/*` |
| Lint | Flat config with `next/core-web-vitals` & TS; custom test rule overrides |
| Tests | Vitest + Testing Library + Playwright (E2E). Coverage already enabled. |
| Performance Tools | Lighthouse CI (`lhci` script) |
| Existing Data/API | Minimal current APIs under `src/app/api/...` (healthz, contact, etc.) |
| Existing Zod | `zod` already installed (v3.23.8) – reuse for schemas |
| Logging | `pino` present (could reuse for PDF route logging) |
| Deployment | Standalone Node (Dockerfile + Helm + k8s manifests) – suitable for Puppeteer (Node runtime) |

## 3. Planned Additions (No Breaking Changes)
New paths/components (scaffold later):
```
/lib/cv/types.ts
/lib/cv/schema.ts
/lib/cv/sample-data.ts
/components/cv/CvView.tsx
/components/cv/ShortenerPanel.tsx
/app/cv/page.tsx
/app/cv/print/page.tsx
/app/api/cv/pdf/route.ts
/styles/print.css
```
Secondary additions: local font assets (if introduced) & README + .env.example updates.

## 4. Data Model (Summary)
Types:
- Skill { id, name, category (enum), level?, years?, tags? }
- Project { id, title, role, period, company?, summary, highlights[], stack[], impact?, links? }
- CvData { person { name, title, contact, profile, links? }, skills[], projects[] }
- CvDesign { page { size, margin, columns, gutter }, palette, typography, shapes[], sections[] }
Selections: optional arrays of skill/project ids.
Validation: Zod schemas; invalid IDs in query silently filtered.

## 5. Rendering & PDF Strategy
- Base HTML + Tailwind for layout; avoid heavy canvas.
- Decorative SVG layer components (pure React, deterministic from props/seed) to allow consistent print/HTML.
- Print CSS: `@page { size: A4; margin: 16mm }`; utility classes for print control (.no-print, .print-only).
- Break control: `break-inside: avoid` on section wrappers.
- Short mode: query parameter `mode=short`; state for selection with shareable permalink (skills, projects query params).
- PDF route: Puppeteer (puppeteer-core) launching a Chromium path from `process.env.CHROMIUM_PATH` or fallback heuristics. Timeout + graceful 501 if not runnable (e.g., serverless / missing binary).
- Post processing with `pdf-lib` metadata injection (Title, Author, Keywords constructed from CvData).
- Fallback: If launch fails -> 501 JSON { error: 'PDF generation not supported in this environment' }.

## 6. Dependencies & Justification
Add: `puppeteer-core` (lightweight) + `pdf-lib` (metadata) – `zod` already present. No removal of existing deps.
No change to Tailwind setup required (already configured). Will add `print.css` imported only where needed (likely in `layout.tsx` or `cv/print` route only to limit global impact).

## 7. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Puppeteer binary absent in container | PDF 500 errors | Provide env var + docs; 501 fallback; document Docker layer to install Chromium (apt) or use prebuilt image. |
| Tailwind v4 future changes (currently prerelease) | Style regressions / purge differences | Scope CV classes under predictable prefixes; rely on utility classes; keep minimal custom CSS. |
| Print layout page breaks | Poor PDF readability | Add explicit print utility classes & test with sample data (long / short variants). |
| Large bundle increase due to Puppeteer (client) | Performance regression | Use `puppeteer-core` strictly in server route only; no client import. |
| Query param injection / invalid ids | Runtime errors | Zod parse & filter unknown IDs. |
| Timeouts in PDF generation (cold start) | Slow API / 504 | Set moderate timeout & allow retry; log durations. |
| Multi-page CV overflow | Cut content | Provide column/paging rules & allow user selection to trim content; builder enforces selection size heuristics (optional). |
| Fonts not embedded | PDF visual mismatch | Serve local WOFF2, ensure `printBackground: true` and CSS `@font-face` accessible. |

## 8. Task Breakdown & Status
- [x] 1 Repo Discovery
- [x] 2 Branch creation and switch to `feature/cv-shortener-and-pdf`
- [x] 3 Add dependencies (puppeteer-core, pdf-lib)
- [x] 4 Scaffold directory & files
- [x] 5 Implement data & schemas (expanded sample data & design presets)
- [ ] 6 Implement CvView + print styles
- [ ] 7 Implement short builder mode
- [ ] 8 Implement server PDF route
- [ ] 9 Add env vars + docs + update PLAN
- [ ] 10 Add tests (Playwright + unit) & CI adjustments
- [ ] 11 Quality checks (Lighthouse ≥ 90 P/A, print review)

## 9. Open Questions
Currently none. Proceed with assumptions: local Chromium will be provided in container or via env path.

## 10. Next Immediate Steps
1. Implement enhanced `CvView` (SVG layers, responsive column logic, print refinements). (Step 6)
2. Add interactive ShortenerPanel (selection state, permalink generation). (Step 7)
3. Implement server PDF route with Puppeteer + pdf-lib metadata. (Step 8)

-- End of initial discovery.
