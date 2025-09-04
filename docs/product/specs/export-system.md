<!-- Source: new spec -->
# Export System Specification (Selective High-Fidelity PDF)

Status: draft
Owner: product/engineering
LastUpdated: 2025-09-03
Related: vision-mission.md, phase-2-roadmap.md, export-matrix.md

## Objective
Provide a deterministic, configurable pipeline to transform the canonical CV website data+components into a selective, reordered, policy-constrained PDF artifact with strong fidelity, performance, and observability.

## Success Criteria (Phase 2)
| Dimension | Metric | Target |
|----------|--------|--------|
| Latency | median cold export time | < 4s |
| Latency | median warm export time | < 2.5s |
| Reliability | failed export rate | < 1% |
| Fidelity | structural drift vs. on-screen DOM (node count diff) | < 2% |
| Customization | configurable sections ordering | 100% listed primary sections |
| Traceability | export requests with root span | 100% |
| UX | preset creation to export flow clicks | ≤ 3 |

## Primary User Stories
1. As an admin I can create multiple named export presets selecting & ordering sections.
2. As an admin I can quickly generate a PDF from a chosen preset.
3. As an admin I can override inclusion rules (limit projects, pick top skills) before exporting.
4. As an admin I can reuse the last exported preset via a Quick Export button.
5. As an admin I receive feedback if export fails with actionable cause.
6. As a viewer (recruiter) opening a PDF I can jump to the full online profile via link / QR.
7. As the system owner I can measure export performance, errors, and downstream site visits.

## Non-Goals (Phase 2)
- Multiple persona data sets (future phase)
- WYSIWYG free-form editing inside export wizard
- Batch multi-locale generation
- Offline queueing / background jobs (synchronous for now)

## Domain Model
```
ExportConfig
  id: string (UUID)
  name: string
  presetType?: 'CUSTOM' | 'COMPREHENSIVE' | 'CONCISE' | 'LEADERSHIP' | 'TECHNICAL'
  sections: ExportSection[] (ordered)
  filters?: ExportFilters
  density?: 'normal' | 'compact'
  colorMode?: 'auto' | 'monochrome'
  paperSize?: 'A4' | 'Letter'
  createdAt: Date
  updatedAt: Date
  version: number (optimistic concurrency)

ExportSection
  key: SectionKey (enum: 'PROFILE' | 'SKILLS' | 'PROJECTS' | 'EXPERIENCE' | 'EDUCATION' | 'CERTIFICATIONS' | 'TRAITS' | 'HOBBIES' | 'CONTACT')
  limit?: number (top-N items within section)
  tags?: string[] (filter items containing all tags)

ExportFilters
  projectSinceYear?: number
  experienceSinceYear?: number
  includePrivateFlags?: boolean (guarded) // future
```

## Data Persistence (SQLite -> Prisma)
Table: ExportConfig
| Column | Type | Notes |
|--------|------|-------|
| id | string (PK) | uuid |
| name | text | unique within admin scope |
| presetType | text nullable | indexed for analytics |
| json | text | serialized configuration (sections, filters, layout options) |
| createdAt | datetime | default now |
| updatedAt | datetime | updated trigger |
| version | int | increment on update |

(Decomposition into relational tables deferred to reduce migration churn.)

## Section Key Enumeration
```
PROFILE, SKILLS, PROJECTS, EXPERIENCE, EDUCATION, CERTIFICATIONS, TRAITS, HOBBIES, CONTACT
```

## API Surface (Initial)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/export/configs | admin | list configs (paginated) |
| POST | /api/export/configs | admin | create new config |
| GET | /api/export/configs/:id | admin | fetch single |
| PUT | /api/export/configs/:id | admin | update (optimistic lock via version) |
| DELETE | /api/export/configs/:id | admin | delete |
| POST | /api/export/generate | admin | generate PDF from configId or inline config |
| GET | /api/export/health | admin | pool / engine status |
| GET | /x/:token | public | tokenized latest preset export (deep link) |

## Request / Response Schemas (TypeScript)
```ts
// Input for create/update
interface ExportConfigInput {
  name: string;
  presetType?: 'COMPREHENSIVE' | 'CONCISE' | 'LEADERSHIP' | 'TECHNICAL';
  sections: Array<{
    key: SectionKey;
    limit?: number;
    tags?: string[];
  }>;
  filters?: {
    projectSinceYear?: number;
    experienceSinceYear?: number;
  };
  density?: 'normal' | 'compact';
  colorMode?: 'auto' | 'monochrome';
  paperSize?: 'A4' | 'Letter';
}

type SectionKey = 'PROFILE' | 'SKILLS' | 'PROJECTS' | 'EXPERIENCE' | 'EDUCATION' | 'CERTIFICATIONS' | 'TRAITS' | 'HOBBIES' | 'CONTACT';

interface ExportGenerateRequest {
  configId?: string; // OR
  inlineConfig?: ExportConfigInput; // validated same schema
  quick?: boolean; // use last used config if true
}

interface ExportGenerateResponse {
  requestId: string;
  status: 'OK';
  bytes: number; // if streamed maybe replaced with header only
}
```

## Validation Rules
| Rule | Enforcement |
|------|-------------|
| At least one section | schema reject |
| Unique section keys | schema reject duplicate |
| limit must be >0 if provided | schema |
| tags length ≤ 8 | schema |
| name length 1..60 | schema |
| Total projected printable pages ≤ 3 (v1 soft) | preflight warning / log |

## Export Generation Flow
1. Validate input (Zod schema). Fail fast 400.
2. Load canonical profile data (single query per collection).
3. Apply filters (date, tags, limits) producing sanitized dataset.
4. SSR export page route with deterministic parameters (disable animations, stable seeds).
5. Wait for network idle OR explicit `window.__EXPORT_READY__` signal.
6. Invoke headless Chromium to print to PDF with defined paperSize, margins, preferCSSPageSize.
7. Stream PDF to client. Update metrics.
8. Cache PDF keyed by hash(profileDataSubset + config JSON + component build version).
9. Emit tracing spans & structured log entry.

## Caching Strategy
- Memory LRU: key = sha256(configHash + profileVersion + buildId)
- TTL: 10m (evict earlier under memory pressure)
- Skip cache if inlineConfig provided (unless length < threshold & flagged quick)

## Concurrency & Pooling
Chromium Context Pool (size 1..N, default 2):
- Acquire with timeout (2s). If none free: create new up to max; else queue.
- Health check counts open contexts + failures.

## Metrics (Prometheus style)
| Name | Type | Labels | Description |
|------|------|--------|-------------|
| export_requests_total | counter | presetType | number of export generate calls |
| export_success_total | counter | presetType | successful exports |
| export_failure_total | counter | reason | failures by class |
| export_duration_ms | histogram | presetType | end-to-end generate latency |
| export_pdf_size_bytes | histogram | presetType | artifact size distribution |
| export_cache_hit_total | counter | | cache served |
| export_cache_miss_total | counter | | cache miss |
| export_context_pool_in_use | gauge | | contexts checked out |

## Tracing Spans
`export.request` (root)
- `export.loadData`
- `export.applyFilters`
- `export.ssr`
- `export.chromium.launch` (cold only)
- `export.chromium.pdf`
- `export.cache.write` / `export.cache.hit`

Attributes: presetType, sectionCount, pageCount (after render), cacheHit(bool), density, colorMode.

## Logging
Levelled JSON logs (info): event="export_complete" fields { requestId, ms, bytes, presetType, sections, pageCount, cacheHit }
Errors include stack + classification, no PII.

## Error Classes
| Code | HTTP | Meaning | Recovery |
|------|------|--------|----------|
| CONFIG_NOT_FOUND | 404 | Missing referenced config | Prompt user to refresh list |
| VALIDATION_FAILED | 400 | Schema / rule violation | Show form errors |
| RENDER_TIMEOUT | 504 | SSR or page ready signal timeout | Suggest retry; increase pool if frequent |
| CHROMIUM_CRASH | 500 | Engine failure | Circuit-break if rate high |
| PDF_STREAM_FAIL | 500 | Stream aborted | Log & track aborted flag |

## Security & Tokens
- Export deep link tokens (route `/x/:token`) map to latest version of a preset (NOT storing PDF blob now).
- Token format: 16 char Base58 (reuse permalink generation util).
- TTL: none initial; revocation by deleting preset.
- Rate limiting: per-IP moderate (export heavy).

## Accessibility
- Admin export UI: keyboard reorder (aria-grabbed), status region announcing steps ("Rendering", "Generating PDF", "Done").
- Contrast & focus states follow existing design tokens.

## UI Flow (Wizard)
1. List presets + Quick Export button.
2. Create / edit preset side panel: section checkboxes, drag handle, limits, density/color/paper.
3. Preview panel (HTML snapshot) updates on change (debounced 400ms).
4. Export button triggers generate; progress steps displayed.
5. Success → download prompt + copy link to deep link.

## Preset Heuristics (Initial)
| Preset | Rules |
|--------|-------|
| COMPREHENSIVE | All sections full |
| CONCISE | PROFILE, SKILLS(limit 12), PROJECTS(limit 3 recent), EXPERIENCE(limit 2 recent), CONTACT |
| LEADERSHIP | PROFILE, EXPERIENCE(limit 3 leadership-tag), PROJECTS(limit 2 strategic), SKILLS(limit 10), CONTACT |
| TECHNICAL | PROFILE, SKILLS(limit 18 tech-tag), PROJECTS(limit 4 recent), EXPERIENCE(limit 2), EDUCATION, CONTACT |

## Testing Strategy
| Layer | Focus |
|-------|------|
| Unit | config validation, filter application, cache key hashing |
| Component | export UI wizard interactions |
| Integration | end-to-end export (stub chromium in CI) |
| Performance | measure latency with warm & cold contexts |
| Visual Regression | diff PDF→PNG pages vs. baseline (threshold) |
| Accessibility | axe scan of wizard & preview |

### Test Fixtures
- Seed profile with >10 projects, varied tags & years
- Large skills list to exercise limits
- Projects without tags ensuring filter no-ops

### Mocking Chromium in CI
- Feature flag `EXPORT_USE_REAL_CHROMIUM=false` → stub returns sample PDF bytes (small) while still exercising flow.

## rollout plan
1. Behind feature flag `export.enabled=false` initially.
2. Land core infra + simple full export.
3. Enable internal flag; test latency & fidelity.
4. Add selection UI + presets.
5. Turn on caching & metrics; adjust pool size.
6. Enable deep link tokens.
7. Remove flag (default on) once stability metrics met.

## Observability Playbook
Symptom → Action:
- Latency spike: check export_duration_ms histogram + context_pool_in_use gauge for saturation.
- Elevated CHROMIUM_CRASH: recycle pool, capture core dumps (if possible), raise alert.
- Cache miss surge: verify hash components (recent deployment changed buildId?).
- Drift regression: visual diff test failure blocks merge.

## Open Questions
- Do we need streaming chunked response vs. full buffer? (Defer until large PDFs >1MB occur.)
- Should presets support conditional section injection (e.g., add CERTIFICATIONS only if present)? (Likely yes – future.)
- Multi-page footer page numbers? (Aesthetic decision post-MVP.)

## Future Extensions
- Batch variant exports (role-specific sets) zipped.
- Persona data partitions.
- Multi-locale export run (A/B localized applications).
- Web viewer for diff between two presets.

---
This document defines the exact system contract to implement the roadmap slices with minimal rework.
