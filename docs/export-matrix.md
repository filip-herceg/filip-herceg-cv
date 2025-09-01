> Deprecated stub. Use `docs/product/export-matrix.md`.
| Recruiter Quick Preview | Short | HTML | `/cv?cv=...` | Person, Key Skills subset, 2–3 Projects | Selection based; truncate summaries | Token permalink already done |
| Tech Lead Deeper Review | Full | HTML Print | `/cv/print` | All | None | Print stylesheet leveraged by PDF route |
| CFP Submission | Focused | PDF | Future param `topics=performance,observability` | Person, Relevant Projects, Speaking (future), Skills (subset) | Filter to topics | Add future domain: talks |
| Public Landing | Short | HTML | `/cv` (default view) | Person (no email), Skills (all), Projects (all) | Redact contact details | Add runtime redaction setting |
| Programmatic Ingestion | Full | JSON | New: `/api/cv/json` | All | No PII redaction by default | Rate-limit / ETag |
| Resume Interchange | Full | JSON Resume | New: `/api/cv/json-resume` | Mapped fields only | Schema mapping; drop unsupported | Validate via JSON Schema |
| Skill Spreadsheet | Short | CSV | New: `/api/cv/skills.csv` | Skills (selected or all) | Flatten categories | Content-Disposition attachment |
| Cover Letter Helper | Ultra-Short | Plain Text | New: `/api/cv/summary.txt` | Person, Top Skills, 1 Project | Summaries condensed | Future GPT prompt usage |
| Social Share | Short | OG Image | `/api/og` (exists) | Person, Tagline | Render highlight | Already implemented |

## Proposed New API Routes
| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/cv/json` | GET | Raw canonical JSON export | Implemented |
| `/api/cv/json-resume` | GET | JSON Resume compatible export | Implemented |
| `/api/cv/skills.csv` | GET | Skills table (id,name,category,level,years) | Implemented |
| `/api/cv/summary.txt` | GET | Ultra-short textual summary | Implemented |

## Canonical JSON Shape
Matches `CvData` with optional `selection` projection meta:
```jsonc
{
  "version": 1,
  "person": { /* ... */ },
  "skills": [ /* filtered subset */ ],
  "projects": [ /* filtered subset */ ],
  "selection": { "mode": "short", "skills": ["ts","react"], "projects": ["obs-platform"] }
}
```

## JSON Resume Mapping (Draft)
| JSON Resume Field | Source | Transform |
|-------------------|--------|-----------|
| `basics.name` | person.name | direct |
| `basics.label` | person.title | direct |
| `basics.email` | person.contact.email | optional redact |
| `basics.website` | person.contact.website | direct |
| `skills[]` | skills | group by category -> keywords |
| `work[]` | experiences/projects | Merge; `position` from role/title |
| `education[]` | education | direct fields |
| `certificates[]` | certifications | rename fields |

## Privacy / Redaction Strategy
Environment or query flag `public=1` triggers:
- Remove email
- Optionally remove location
- Remove hobbies if flagged private

## Caching & Performance
- JSON/CSV/text routes: `Cache-Control: public, max-age=300, stale-while-revalidate=86400`
- ETag using hash of serialized canonical payload
- Respect selection token: allow `?cv=<token>` on JSON endpoint to project subset (reuse `decodePreset`).

## Error Handling
- Invalid `cv` token: 400 with JSON `{ error: 'invalid_preset' }` but still allow `selectionFromExpanded` fallback.
- Oversized response (unlikely) -> streaming not required given small data volume.

## Test Plan
- Unit: mapping utilities for JSON Resume, redaction, CSV serialization, summary text generation.
- Integration: each new route returns expected MIME, content length >0, redaction behavior under `public=1`, selection projection from `cv` token.
- Edge Cases: empty selection arrays, unknown skill IDs in token (ignored), unsupported version tokens.

## Implementation Phases
1. Utilities: projection + redaction + mapping helpers under `src/lib/cv/export.ts`.
2. Routes incremental (json -> csv -> json-resume -> summary).
3. Tests after each route (ensure coverage >=80% branches for new file).
4. Docs update status (this file) from ⏳ to ✅ when done.

## Deferred Ideas
- Add ZIP bundle endpoint (`/api/cv/bundle.zip`) containing PDF + JSON + TXT.
- Add signed token variant with HMAC for integrity.
- Streaming NDJSON for large multi-profile scenario (out of current scope).

