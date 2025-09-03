---
title: Legacy Doc Aliases
status: informational
lastUpdated: 2025-09-03
canonical: docs/legacy-aliases.md
---
# Legacy Documentation Aliases

This file records removed flat documentation filenames and their canonical replacements after the Phase 2 reorganization. It helps avoid re‑introducing obsolete paths and serves as a reference for updating any external links.

| Removed Path | Canonical Path |
|--------------|----------------|
| docs/architecture.md | docs/architecture/architecture.md |
| docs/observability.md | docs/architecture/observability.md |
| docs/operations.md | docs/operations/operations.md |
| docs/cicd.md | docs/engineering/ci-cd.md |
| docs/permalink.md | docs/product/permalink.md |
| docs/engineering/cicd.md | docs/engineering/ci-cd.md |

If an external bookmark relies on one of the removed paths, consider adding an HTTP redirect at the hosting layer (e.g., static redirect rules or reverse proxy) pointing old -> new.

