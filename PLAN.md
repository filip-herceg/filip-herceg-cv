## Phase 2 Slice 2 – Section Selection MVP (Working Plan)

Scope: Provide CRUD + inline editing UI for Export Configs, enable selection-driven PDF generation using stored configs, and surface optimistic concurrency.

Checklist (update as tasks complete):

- [ ] API completeness
	- [x] List configs (GET /api/export/configs)
	- [x] Create config (POST /api/export/configs)
	- [x] Update config (PUT /api/export/configs) with version check
	- [x] Delete config (DELETE /api/export/configs)
	- [ ] Generate using stored configId (already supported in /api/export/generate via configId) – add test
- [ ] Admin UI `/admin/exports`
	- [ ] List existing configs with name, presetType, version, updatedAt
	- [ ] Create new config form (name, presetType, sections builder, filters, density/colorMode/paperSize)
	- [ ] Edit existing (load + mutate + pass version)
	- [ ] Delete config action (with confirm)
	- [ ] Reorder sections (keyboard + drag hints; simple up/down buttons ok for MVP)
	- [ ] Validation errors surfaced inline
	- [ ] Concurrency conflict toast (on 409)
- [ ] Selection logic
	- [x] Basic deriveSelection implemented (filters + limits)
	- [ ] Apply tags (future slice; not in schema usage yet) – DEFER
	- [ ] Quick Export last-used config (store id in cookie or meta) – MVP optional
- [ ] Tests
	- [ ] Repository CRUD unit tests
	- [ ] /api/export/configs integration tests (create/update conflict/delete)
	- [ ] /api/export/generate using configId path
	- [ ] Admin UI component test (sections reorder + submit)
- [ ] Metrics/Logging
	- [ ] Log UI actions (optional) – DEFER
	- [ ] Confirm existing domain:export.configs.* coverage adequate
- [ ] Accessibility
	- [ ] Section reorder buttons have aria-labels
	- [ ] Form inputs labeled
- [ ] Documentation
	- [ ] Update docs/export-system.md with UI notes & version conflict handling
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
