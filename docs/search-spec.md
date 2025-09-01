> Deprecated stub. Use `docs/product/search-spec.md`.

# Search & Filter Specification (Draft v0)

Status: Task 3 of 7 (Schema ✅ · Taxonomy ✅ · Search Spec ⏳ · Permalink Spec → Export Matrix → Perf/A11y Budgets → Logging & Privacy)

Goal: Provide a lightweight, deterministic, client-side search / filter facility for CV data that can later evolve into a service-backed index (e.g. Meilisearch, Typesense, or Elastic). Initial implementation favors zero extra runtime dependencies.

## 1. Scope
Searchable entities:
- skills
- projects
- experiences
- education
- certifications

(Other entities like traits & hobbies may be enabled later, but excluded initially to keep noise low.)

## 2. Data Extraction / Indexing
Each entity becomes a document with a normalized shape:
```
{
  kind: 'skill' | 'project' | 'experience' | 'education' | 'certification',
  id: string,
  title: string,          // display label / main field
  terms: string[],        // token list used for matching
  boost: number,          // base boost per kind
  facets: {               // structured filtering metadata
    category?: string      // skill.category
    employmentType?: string
    issuer?: string        // certification issuer
    institution?: string   // education institution
    year?: number          // certification year derivable
  },
  raw: unknown            // original object (reference)
}
```

Tokenization: lowercase; split on non-alphanumeric; discard tokens length < 2 (except digits-only years); de-duplicate.

## 3. Ranking Model (v0)
Score = Σ(termMatchScore) * kindBoost + field bonuses

Where:
- termMatchScore: 1 for exact token match, 0.5 for prefix match (query token is prefix of document token)
- kindBoost:
  - project: 3.0 (rich narrative)
  - experience: 2.5
  - skill: 2.0
  - education: 1.5
  - certification: 1.25
- Field bonuses (added once if any token hits that field):
  - title match bonus: +1.0
  - highlights / achievements / summary match: +0.75
  - stack / tags overlap: +0.5

Tie-breakers (in order):
1. Higher score
2. Newer implicit period/year if available
3. Lexicographical id

## 4. Query Parsing
Input query string is tokenized like documents. Empty query returns top-N (by boost then recency). Quoted phrases not yet supported (future work). Provide `limit` (default 20) and `kinds` or facet filters.

## 5. Filters
Supported filter options (all optional):
```
{
  kinds?: string[]
  category?: string
  employmentType?: string
  issuer?: string
  institution?: string
  year?: number | { gte?: number; lte?: number }
}
```
Filters applied post-scoring, before slicing for limit.

## 6. Facet Aggregation (v0)
Return counts for dimension values present in the filtered hit set (before limit) for: category, employmentType, issuer, institution, year.

Return shape:
```
{
  query: string,
  tokens: string[],
  results: Array<{ kind; id; title; score; snippet?: string }>,
  facets: { category: Record<string, number>; employmentType: Record<string, number>; ... },
  total: number
}
```

## 7. Snippet Strategy
For narrative entities (project / experience / education): take the first matching sentence (split by '.') containing any query token; trim to 160 chars. For skills and certifications snippet omitted (or simple derived field). v0 may just return summary/impact snippet if available.

## 8. Performance Considerations
Data scale is tiny (< few hundred docs). Simple O(N * Q) scoring acceptable. Future: pre-compute token->doc inverted map if latency becomes an issue.

## 9. Internationalization Readiness
Tokenizer is simplistic; later adaptation: use Intl.Segmenter where available. Non-latin scripts currently unsupported nuance (future note).

## 10. Security / Privacy
Client-side only. No PII beyond existing CV content. Avoid logging raw queries by default (if metrics added later, hash tokens).

## 11. Extension Points
| Feature | Future Enhancement |
|---------|--------------------|
| Fuzzy | Levenshtein distance threshold <= 1 for tokens length >= 4 |
| Phrase | Quoted phrase support with sequential token requirement |
| Synonyms | Skill synonyms map (e.g. js->javascript) applied pre-tokenization |
| Weights | User-defined boosts per section |
| Pagination | Support cursor / offset once > limit size meaningful |

## 12. Testing Strategy
Unit tests validate:
- Index building correctness (kinds present, token extraction)
- Simple query scoring ordering (project outranks skill when both contain token)
- Facet counts accuracy with and without filters
- Filters (category, employmentType) reduce result set appropriately
- Year range filter
- Empty query returns boosted ordering

## 13. Non-Goals (v0)
- No persistence layer
- No server API endpoint (could be added later at `/api/cv/search`)
- No highlighting markup (just plain snippet)

## 14. Acceptance Criteria
- Deterministic scoring & tie-breaking documented
- Implemented pure TS module with zero external deps
- Unit tests covering ranking, filters, facets
- High coverage without fragile assertions

---
Implementation reference: `src/lib/cv/search.ts` (created alongside this spec). Tests: `src/tests/unit/cv-search.test.ts`.
