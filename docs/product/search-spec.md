<!-- Source: formerly docs/search-spec.md -->
# Search Specification

## Goal
Enable keyword search across CV content (skills, projects, experiences) to produce relevance-ranked results supporting potential employer queries.

## Scope
- Index skills (name, category)
- Index projects (name, description, highlights)
- Index experience (company, role, highlights)
- Exclude hobbies, traits initially

## Query Model
Simple multi-term OR query with term frequency scoring + field weighting.

| Field | Weight |
|-------|--------|
| skill.name | 3 |
| project.name | 2 |
| experience.company | 2 |
| highlights tokens | 1 |

## Ranking
Score = Σ(termWeight * termFrequency).
Tie-breakers: entity priority (skills > projects > experience), then alphabetical.

## Architecture
Phase 1: In-memory inverted index built at startup / data load.
Phase 2: Regenerate index on admin mutations (invalidate + rebuild localized index).
Phase 3: Optional external search service (e.g., Meilisearch) for fuzzy matching & prefix queries.

## API
`GET /api/search?q=<terms>&locale=<code>` -> `{ results: Array<{ entityType, id, score, snippet }> }`

## Snippet Generation
Highlight first occurrence context window (±30 chars) with simple ellipsis truncation.

## Metrics
- `search_queries_total{locale}`
- `search_results_total{entityType}`
- `search_latency_ms` (histogram)

## Future Enhancements
- Token stemming per locale
- Synonym dictionary (configurable)
- Fuzzy tolerance (Levenshtein distance <=1)