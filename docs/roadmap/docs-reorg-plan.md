# Documentation Reorganization Plan

Status: Phase 1 (directory scaffold + new index) COMPLETE

## Goals
1. Introduce consistent domain-based folder structure.
2. Remove duplication & stale task files while preserving historical decision records.
3. Provide clear entry points for different contributor intents (product, architecture, engineering, operations).
4. Establish naming and metadata conventions for future docs.
5. Minimize broken links via transitional alias stub files (Phase 2).

## Target Structure
```
docs/
  README.md (nav)
  product/
    vision-mission.md
    taxonomy.md
    search-spec.md
    permalink-spec.md
    export-matrix.md
    i18n-seo-phase2.md
    task-4-permalink-status.md (historical)
  architecture/
    architecture.md
    persistence.md
    admin.md
    observability.md
  engineering/
    development.md
    cicd.md
    ci-cd-review.md
    refactor-plan.md
    refactor-rate-limiter.md
    task-6-perf-a11y-budgets.md
    task-7-logging-privacy.md
  operations/
    operations.md
    kubernetes.md
  roadmap/
    phase-2-roadmap.md
    f17-retrospective.md
    docs-reorg-plan.md
  contributing.md
```

## Phase Breakdown
| Phase | Actions | Exit Criteria |
|-------|---------|---------------|
| 1 | Create folders, new index, plan doc | Folders exist, index updated |
| 2 | Move primary docs into folders, adjust internal links, add legacy stub (with rel=canonical note) | All listed target files relocated |
| 3 | Create redirect/stub strategy (Next.js route or remark plugin note) for external references | Opening old path shows deprecation header |
| 4 | Deduplicate overlapping content (e.g. cicd vs ci-cd-review) & merge | Single source of truth per topic |
| 5 | Add front-matter metadata (title, status, lastUpdated) & automated TOC generation script | Metadata present & lint passes |
| 6 | Introduce docs quality CI (broken link checker) | CI fails on broken anchors |

## Conventions
| Aspect | Rule |
|--------|------|
| Filenames | kebab-case, topic-focused |
| Headings | H1 matches filename summary; one H1 per file |
| Status Badge | Optional line under H1 for WIP/Historical/Complete |
| Historical Docs | Add `> Historical:` block explaining relevance |
| Cross-links | Relative paths (`../product/...`) |
| Metrics/Routes | Use backticks for code names |

## Link Migration Strategy
1. After moves (Phase 2), add small placeholder at old path:
```
# Moved: <New Title>
This document moved to `docs/<new path>`. Please update bookmarks.
```
2. Optional: Add a Next.js `redirects()` entry mapping any published URLs (if site serves docs). Not currently published — skip for now.

## Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Broken links in repo | Run link checker in Phase 6 |
| Lost context of historical tasks | Preserve full text under product/ or engineering/ with Historical note |
| Contributor confusion during migration | Keep index dual-linking until Phase 3 |

## Open Decisions
- Introduce mkdocs/docusaurus later? (Defer until size > ~40 topical docs.)
- Add tagging metadata for search? (Could embed YAML front matter Phase 5.)

## Next Action
Proceed to Phase 2 file moves & link rewrites.
