# CV Persistence & Localization Plan (Dynamic Editable CV)

## Problem Statement
Current implementation ships CV content as static JSON embedded at build time. Requirement: Each deployment starts with an *empty* CV and the site owner can log in to add / modify / remove content. Changes must persist per-instance and support multiple locales with minimal friction when editing.

## Goals
- Zero bundled private CV data by default (privacy & portability)
- Runtime persistence (database) with migration & validation
- CRUD admin interface (secure) for all CV entities & design settings
- Localization workflow: easy propagation of edits across locales; visibility into missing translations
- Continue strong test coverage & type safety (reuse existing Zod schemas)
- Backwards compatibility path (migration script from legacy JSON if present)

## Non-Goals (Phase Initial Slice)
- External SaaS CMS integration (can be future adapter)
- Granular RBAC beyond single admin user
- Realtime collaborative editing

## Architecture Overview
```
[Admin UI (/admin)] -> Next.js Route Handlers -> CV Service Layer -> Persistence (Prisma ORM) -> DB (SQLite dev / Postgres prod)
                                             |-> Cache (in-memory LRU keyed by locale + etag version)
                                             |-> Zod validation (schema.ts reused)

Public Pages/API -> Read via CV Service (cache-first, then DB) -> Zod parse -> Response
```

## Data Model (Prisma Draft)
- Locale: table or enum? Use string field to allow flexible expansion.
- Entities map closely to existing Zod schemas: Person, Skill, Project(+links), Experience(+achievements), Education, Certification, Trait, Hobby, Design (page/palette/typography/shapes/sections) .
- Use stable `id` (string) provided by user to keep permalink & selection feature compatibility.
- Translation Approach: Either separate tables per entity with `locale` column OR a base entity + localized content table. Simplicity first: each localized row fully independent (denormalized) keyed by (id, locale). For small dataset scale, duplication cost acceptable and simplifies logic.

Example (simplified):
```prisma
model Project {
  id       String  // stable logical id
  locale   String  // e.g. 'en'
  title    String
  role     String
  period   String
  company  String?
  summary  String
  highlights String[]
  stack    String[]
  impact   String?
  links    Json?  // array of {label,url}
  @@unique([id, locale])
}
```

Design objects: Single row per locale storing JSON for shapes/sections or normalized tables for filtering. Start with JSON column per locale (Prisma `Json`) then iterate if needed.

## Localization Workflow
1. Admin creates / updates entity in primary locale (e.g. 'en').
2. System marks translation status: for other enabled locales, create placeholder rows flagged `needsTranslation=true` copying source text as provisional.
3. Admin UI translation dashboard: list entities per locale with status (Complete / Missing / Stale if source updated later).
4. Fallback logic (public read): If requested locale row missing -> fallback to primary locale but set `x-cv-fallback: primary` header for observability.
5. Optionally surface a build-time script to generate diff report of untranslated fields.

## Caching & Invalidation
- In-memory map: key = locale; value = structured aggregate object shaped like current `CvData` + `CvDesign`.
- ETag version: increment stored in DB table `Meta` or derive hash of updated_at timestamps.
- On any mutation commit: invalidate locale cache & recompute ETag.

## Security / Auth
- Minimal: Password (bcrypt) stored in DB + session cookie (HttpOnly, SameSite=Lax, secure in prod). Optional environment variable to bootstrap initial admin password hash.
- Future: Upgrade to WebAuthn or OIDC provider.

## API Surface (Phase 1 Admin)
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/admin/login | Create session |
| POST | /api/admin/logout | Destroy session |
| GET | /api/admin/cv?locale=xx | Fetch aggregate (for admin editor) |
| POST | /api/admin/entity/<type> | Create (locale, id, payload) |
| PUT | /api/admin/entity/<type>/<id>?locale=xx | Update |
| DELETE | /api/admin/entity/<type>/<id>?locale=xx | Remove |
| POST | /api/admin/locale/enable | Enable new locale (bulk placeholders) |

All admin endpoints require session validation middleware.

## Migration Strategy
- Detect existing static JSON files; on first admin login provide a one-click import to seed DB for primary locale.
- After successful import, optionally delete or ignore static JSON to prevent confusion.

## Testing Plan
- Unit: Service layer CRUD with in-memory SQLite (Prisma `:memory:`) + Zod validation failures.
- Integration: Route handlers auth flow + CRUD (Vitest + supertest-style fetch).
- E2E (later): Admin UI form interactions (Playwright) behind feature flag.
- Coverage target remains >= current thresholds.

## Incremental Delivery Plan
| Step | Feature Slice | Included | Excluded |
|------|---------------|----------|----------|
| 1 | Add Prisma + schema + migration + service read path (read-only) | DB seeding from JSON, public reads via DB | Admin UI, writes |
| 2 | Admin auth session + minimal login form | Login/logout, session middleware | UI polish |
| 3 | CRUD APIs for core entities (skills, projects, person, design) | Validation, cache invalidation | Advanced entities (traits/hobbies) |
| 4 | Localization enable + placeholder creation | Locale management endpoints | Translation dashboard |
| 5 | Admin UI pages (basic forms) | Create/update for core entities | Rich editors, diffing |
| 6 | Translation status dashboard + fallback header instrumentation | Status API, header | Stale detection (will be next) |
| 7 | Stale detection + import tool removal | Hash compare + marking | External CMS adapter |

## Changes to Existing Roadmap
Adds F16–F18 replacing static content path for long-term. Earlier F01/F02 depend on F16 now.

## Risks
| Risk | Mitigation |
|------|------------|
| ORM adds build time and complexity | Keep schema minimal & incremental; use SQLite dev, Postgres prod |
| Admin surface increases attack surface | CSRF tokens + secure cookies + rate limit login |
| Locale proliferation complexity | Config-driven enabledLocales array + guardrails |

## Open Questions
- Prefer Drizzle instead of Prisma for lighter footprint? (Prisma chosen for DX unless bundle constraints surface.)
- Where to store design shapes: normalized vs JSON? Start JSON.

## Next Action
Implement Step 1: Introduce Prisma schema & service layer read path (keeping existing JSON as seeding source until DB populated). Update loader to attempt DB first, fallback to JSON (temporary) with warning log.
