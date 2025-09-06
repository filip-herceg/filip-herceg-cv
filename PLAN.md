## Phase 2 Slice 2 – Section Selection MVP (Working Plan)

Scope: Provide CRUD + inline editing UI for Export Configs, enable selection-driven PDF generation using stored configs, and surface optimistic concurrency.

 Checklist (update as tasks complete):

- [x] API completeness
	- [x] List configs (GET /api/export/configs)
	- [x] Create config (POST /api/export/configs)
	- [x] Update config (PUT /api/export/configs) with version check
	- [x] Delete config (DELETE /api/export/configs)
	- [x] Generate using stored configId (already supported in /api/export/generate via configId) – test added (`export-configs.test.ts`)
- [x] Admin UI `/admin/exports`
	- [x] List existing configs with name, presetType, version, updatedAt
	- [x] Create new config form (name, presetType, sections builder, filters, density/colorMode/paperSize)
	- [x] Edit existing (load + mutate + pass version)
	- [x] Delete config action (with confirm)
	- [x] Reorder sections (keyboard + drag hints; simple up/down buttons ok for MVP)
	- [x] Validation errors surfaced inline (basic inline status messages)
	- [x] Concurrency conflict toast (status message on 409 & refetch)
- [ ] Selection logic
	- [x] Basic deriveSelection implemented (filters + limits)
	- [ ] Apply tags (future slice; not in schema usage yet) – DEFER
	- [x] Quick Export last-used config (cookie) – IMPLEMENTED
- [x] Tests
	- [x] Repository CRUD unit tests
	- [x] /api/export/configs integration tests (create/update conflict/delete)
	- [x] /api/export/generate using configId path
	- [x] Admin UI component test (sections reorder + submit + conflict)
- [ ] Metrics/Logging
	- [x] Derive selection & total export duration histograms
	- [ ] Log UI actions (optional) – DEFER
	- [x] Confirm existing domain:export.configs.* coverage adequate
- [x] Accessibility
	- [x] Section reorder buttons have aria-labels
	- [x] Form inputs labeled
- [ ] Documentation
	- [x] Update docs/export-system.md with UI notes, metrics & quick export
	- [ ] Add README snippet for admin exports usage

Assumptions:
- Minimal styling; reuse existing button/input components.
- Reorder via up/down is acceptable for MVP (drag & drop later).
- Tags feature postponed (present in schema but not yet surfaced in UI builder aside from text input placeholder).

Risks / Open Questions:
- Concurrency: race window small; 409 handling via refetch+retry pattern.
- Performance: list expected small (<50 configs) – no pagination.

Next Immediate Steps:
1. Implement `/admin/exports/page.tsx` listing + basic create form skeleton.
2. Add integration tests for /api/export/configs (version conflict path) & generate with configId.
3. Enhance UI with edit & reorder.
