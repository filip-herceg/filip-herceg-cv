<!-- Source: formerly docs/taxonomy.md -->
# Content Taxonomy

Defines canonical entities composing a CV profile. Ensures consistent schema across persistence, validation, and API responses.

## Entities
| Entity | Key Fields | Description |
|--------|------------|-------------|
| Person | name, title, location, summary, links[] | Core identity |
| Skill | id, name, category, level, years | Capability classification |
| Project | id, name, description, highlights[], links[] | Portfolio showcase |
| Experience | id, company, role, startDate, endDate?, highlights[] | Employment history |
| Education | id, institution, degree, startDate, endDate? | Academic background |
| Certification | id, name, authority, date | Professional credentials |
| Trait | id, name, description? | Personal/soft attribute |
| Hobby | id, name, description? | Personal interests |
| Design | layout sections ordering, feature toggles | Presentation configuration |

## Identifier Rules
- `id`: kebab-case, stable across edits.
- Date fields: ISO 8601 (YYYY-MM)
- Optional arrays default to empty; never null.

## Validation Principles
- Mandatory semantic fields required (e.g., `name` for all display entities).
- Numeric ranges validated (years >=0, <= 60).
- Use discriminated unions only when diverging shape semantics exist.

## Localization Strategy (Future)
Introduce `locale` column and composite unique constraints `(id, locale)` enabling localized variants while preserving global identity grouping.

## Deprecation Policy
Fields marked experimental by adding `_experimental` suffix; removal after two releases if superseded.