> Deprecated stub. Use `docs/product/taxonomy.md`.

# CV Domain Taxonomy (Draft v0)

Status: Draft v0 (Tasks Roadmap: 1 Schema ✅ · 2 Taxonomy (this) ⏳ · 3 Search Spec → 4 Permalink Spec → 5 Export Matrix → 6 Perf/A11y Budgets → 7 Logging & Privacy)

This document defines canonical entities, required / optional fields, identifiers, relationships, and normalization rules for the CV data model implemented in `src/lib/cv/schema.ts` and `src/lib/cv/types.ts`.

## 1. Core Entities

| Entity | ID Field | Required Fields | Optional Fields | Cardinality / Notes |
|--------|----------|-----------------|-----------------|--------------------|
| Person | (implicit) | name, title, profile, contact.email | contact.(location, phone, website, github, linkedin, twitter), links[] | Exactly 1 per CV |
| Skill | id | name, category | level, years, tags[] | Many; category constrained to enumerated list |
| Project | id | title, role, period, summary | company, highlights[], stack[], impact, links[] | Many; Should reference skills (by name) only loosely in stack |
| Experience | id | company, role, period | location, employmentType, summary, achievements[], stack[], tags[] | Zero or more; achievements[] may reference metrics |
| ExperienceAchievement | (inline) | summary | impact, metrics[] | Nested inside experience |
| Education | id | institution, degree, period | field, location, grade, summary, highlights[] | Zero or more |
| Certification | id | name, issuer | year, url | Zero or more; year validated (1900..current) |
| Trait | id | name | description, category | Zero or more; soft skill / attribute |
| Hobby | id | name | description | Zero or more |
| Design (page/palette/typography/shapes/sections) | n/a | page, palette, typography, shapes[], sections[] | — | Exactly 1 design object |
| Selection | — | — | skills[], projects[], experiences[], education[], mode | Subset filter context |

## 2. Field Semantics & Validation Rules

### Identifiers
- All `id` values: stable, URL-safe (`^[a-z0-9-]+$` recommended though schema currently only enforces non-empty string). Future improvement: add pattern.
- No duplicate ids within each collection.
- Cross-entity collisions allowed (project and skill may share id) but discouraged for clarity.

### Enumerations
- `Skill.category` enum (current): Language, Framework, Tool, Concept, Platform, Service, Library.
- `Experience.employmentType`: Full-time, Part-time, Contract, Freelance, Internship.
- `CvSelection.mode`: currently only `short`; extensible (e.g. `pitch`, `full`).

### Temporal & Period Fields
- `period` free-form string to permit ranges (e.g. `2023 – 2024`). Future: normalized shape `{ from: YYYY-MM / to: YYYY-MM | null }` retained alongside display.

### Quantitative Fields
- `Skill.years`: integer range [0,60]. If omitted, treat as unquantified experience.
- `Certification.year`: range [1900, currentYear].

### Rich Content Arrays
- `highlights`, `achievements.metrics`, `achievements.summary`, `traits.description`: single-line summaries; prefer active voice and measurable impact.

### Stack Representation
- `Project.stack` and `Experience.stack`: simple string labels referencing technology keywords; normalization layer may map to canonical skill ids later.

## 3. Relationship Model

| Source | Relation | Target | Type | Notes |
|--------|----------|--------|------|-------|
| Project.stack[] | loosely references | Skill.name | implicit | No enforced FK; search/index layer may join |
| Experience.stack[] | loosely references | Skill.name | implicit | Same treatment |
| Selection.* arrays | filters | Respective entity collections | subset | Unknown ids are ignored gracefully |

No hard foreign keys to keep authoring friction low. Validation step (optional future) can produce warnings for orphan references.

## 4. Normalization Guidelines

| Concern | Guideline | Rationale |
|---------|-----------|-----------|
| Text casing | IDs kebab-case; display names Title Case | Consistency & readability |
| Metrics | Express improvements as absolute + % where possible | Comparative clarity |
| Lists ordering | Skills: descending seniority/years; Projects: reverse chronological; Experiences/Education: reverse chronological | Reader expectation |
| Highlights length | Prefer 1–2 lines, max ~120 chars | Scannability |
| Tags | Use lowercase simple nouns | Faceted search alignment |
| Period glyph | Use en dash `–` for ranges | Typography quality |

## 5. Selection Semantics

`CvSelection` provides query-parameter-friendly CSV lists:
```
?skills=ts,react&projects=edge-cdn&experiences=exp-acme&education=edu-bs&mode=short
```
Parsing: each comma-separated segment filtered for non-empty strings. Unknown ids: ignored (idempotent). Empty param or absence: omit filtering for that dimension.

Future enhancements:
- Compressed permalink variant (base64 or URL-safe RLE for sparse sets) defined in Permalink Spec (Task 4).
- Mode-specific default sections (e.g., `short` hides hobbies & traits unless explicitly selected).

## 6. Section Configuration

`CvDesign.sections[]` drives render order & visibility. Each `id` should match one of canonical segments:
```
profile | skills | projects | experiences | education | certifications | traits | hobbies
```
Non-canonical entries allowed (custom sections) but may be excluded from automated exports/search facets.

## 7. Versioning Strategy

Introduce a `meta` object (future) at root of `CvData`:
```
meta: { schemaVersion: 1, generatedAt: ISO8601 }
```
Migration notes will be anchored to version numbers. Breaking change triggers major increment; additive fields increment minor (optional).

## 8. Quality & Linting Hooks (Proposed)

| Rule | Implementation Idea | Priority |
|------|---------------------|----------|
| Duplicate id detection | Pre-build script scanning arrays | High |
| Orphan skill reference | Validate stack labels map to existing skill names | Medium |
| Achievement verb style | Regex check first word against approved verbs list | Low |
| Metrics presence | If achievement has impact, encourage at least one metric | Medium |

## 9. Future Schema Extension Points

| Concept | Description | Potential Fields |
|---------|-------------|------------------|
| Publications | Articles / talks | id, title, venue, date, url |
| Awards | Recognitions | id, title, issuer, year, summary |
| Languages (Human) | Spoken languages | id, name, proficiency |
| Volunteer | Community contributions | id, org, role, period, highlights[] |

## 10. Data Life-Cycle Considerations

- Authoring Source: single JSON or TypeScript module (currently `sample-data.ts`).
- Build-time Validation: Zod parse (already present) + optional custom QA rules.
- Runtime Rendering: Components consume strongly-typed data; absence of optional arrays must not break layout.
- Export: PDF route should degrade gracefully when optional arrays empty.

## 11. Accessibility & Internationalization Hooks

- Section labels should be user-editable to support localization.
- Future: allow `PersonInfo.profile` multi-lingual variants `{ profile: { en: string, de?: string } }` while keeping current shape backward compatible.

## 12. Indexing & Search Preview (Forward Reference)

(Expanded fully in Task 3.) Preliminary field groups:
- Full-text: person.profile, project.summary, project.highlights, experience.summary, achievements.summary
- Facets: skill.category, experience.employmentType, certification.issuer, education.institution
- Sort Keys: period-from (parsed), years, skill.level rank mapping

## 13. Minimal vs. Rich Example

Minimal (valid):
```json
{
  "person": { "name": "Jane Dev", "title": "Engineer", "profile": "Builder.", "contact": { "email": "jane@example.dev" } },
  "skills": [{ "id": "ts", "name": "TypeScript", "category": "Language" }],
  "projects": [{ "id": "p1", "title": "Proj", "role": "Dev", "period": "2024", "summary": "Did X" }]
}
```

Rich (excerpt):
```json
{
  "experiences": [{
    "id": "exp-acme",
    "company": "Acme",
    "role": "Tech Lead",
    "period": "2023 – 2024",
    "achievements": [{ "summary": "Unified telemetry pipeline", "impact": "MTTR -22%" }]
  }],
  "education": [{ "id": "edu-bs", "institution": "State U", "degree": "B.Sc.", "period": "2015 – 2018" }]
}
```

## 14. Open Questions

| Topic | Question | Tentative Answer |
|-------|----------|------------------|
| Period normalization | Add structured dates now? | Defer until search spec (Task 3) |
| Skill hierarchy | Grouping / parent-child? | Possibly derive categories programmatically later |
| ID pattern enforcement | Enforce via Zod regex? | Add in schema v2 to avoid breaking existing data |
| Multilingual support | Inline vs. keyed object? | Keyed object to avoid positional ambiguity |

## 15. Acceptance Criteria (for this document)
- Enumerates every current entity (✅)
- Distinguishes required vs optional fields (✅)
- Defines relationships & normalization (✅)
- Provides examples (✅)
- Surfaces open questions for subsequent specs (✅)

---
Next: Implement Task 3 (Search & Filter Specification) building on the field groupings and normalization bases defined here.
