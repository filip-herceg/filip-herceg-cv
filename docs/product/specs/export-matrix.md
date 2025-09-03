<!-- Source: formerly docs/export-matrix.md -->
# Export Feature Matrix

| Aspect | PDF | Permalink | Static HTML Save |
|--------|-----|-----------|------------------|
| Offline Access | Yes | Browser dependent | Yes |
| Branding Control | High (layout) | Medium (theme) | Low |
| Shareability | Medium (file) | High (URL) | Low |
| SEO | None | High (canonical) | None |
| Tracking | Manual (open detection) | Standard analytics | None |
| Integrity | Static snapshot | Dynamic live view | Static |

## PDF Generation
- Headless Chromium (Playwright)
- Graceful 501 if binary not available (e.g., serverless)
- Cache hash of content -> avoid regenerating identical PDF (planned)

## Permalink
- Short token redirect
- Optional snapshot (future: freeze data JSON)

## Roadmap
| Phase | Feature |
|-------|---------|
| 1 | Basic PDF + permalink create/resolve |
| 2 | Snapshot persistence for permalink |
| 3 | Export customization (theme toggle) |
| 4 | Batch export (multi-locale) |
