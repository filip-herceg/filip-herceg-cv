# Permalink & Preset Specification (Task 4)

## Goals
Provide a stable, shareable URL ("permalink") that captures a CV view *preset*:
- Which subset of entities (skills, projects, experiences, education) are shown
- Optional presentation mode flags (e.g. `mode=short`)
- Future extension: design theme overrides (palette, shapes, sections)

Constraints:
- Short, human‑inspectable for simple cases
- Versioned & forward compatible
- Safe to embed (URL‑safe charset)
- Deterministic ordering (stable decode → encode roundtrip)

## Core Data Model
```
PresetSelection {
  skills?: string[]
  projects?: string[]
  experiences?: string[]
  education?: string[]
  mode?: 'short'
  v: number   // version integer (implicit when absent = 1)
}
```

Only non‑empty arrays are stored. Ordering is alphabetical within each list to ensure canonical form.

## Query Parameter Forms
1. Expanded (debug / simple) form – direct reuse of existing selection query keys:
```
?skills=ts,react&projects=edge-cdn&mode=short
```
2. Compact encoded form – single param `cv` containing a compressed payload.

### Encoding Pipeline (v1)
```
PresetSelection (object) → JSON (minified) → UTF-8 bytes → deflate (raw) → base64url
```
- `base64url` alphabet: `A-Z a-z 0-9 - _` (no padding `=`) for URL friendliness.
- If expanded keys are also present, `cv` takes precedence for decode.
- If `cv` decodes successfully, ignore expanded keys to avoid ambiguity.

### Versioning
- Version embedded **inside** decoded JSON: `{ v: 1, skills:[...] }`.
- Future incompatible change increments `v`. Decoder selects strategy.
- Unknown `v` → fail gracefully returning `undefined` (consumer can fall back to default preset).

### Security / Privacy
- No PII beyond already public IDs is encoded.
- Reject payloads > 2KB post‑decode to mitigate abuse.
- Schema validation (whitelist keys + string id constraints / length <= 64).

### Error Handling Strategy
- Decode errors (base64, inflate, JSON): return `null` status object `{ ok:false, reason:'decode_error' }`.
- Schema validation failure: `{ ok:false, reason:'invalid_payload' }`.
- Unsupported version: `{ ok:false, reason:'unsupported_version', version }`.

### Canonicalization Rules
- Remove empty arrays / falsy fields before encode.
- Sort each array ascending (localeCompare) prior to serialization.
- Omit `v` when `1` in encoded compact form to shave bytes (decoder treats missing as `1`).

### Example
Selection: `{ skills:['react','ts'], projects:['edge-cdn'], mode:'short' }`
JSON: `{"skills":["react","ts"],"projects":["edge-cdn"],"mode":"short"}`
(Compressed & base64url) → `cv=eyJza2lsbHMiOlsiCm...` (illustrative, real string differs).

## API (Helper Module)
```
encodePreset(selection: PartialPreset) => string  // returns base64url token
buildPermalink(baseUrl: string, selection) => string // appends ?cv=...
decodePreset(tokenOrSearchParams: string|URLSearchParams) => { ok:true, preset:PresetSelection } | { ok:false, reason:string }
```

## Non-Goals (v1)
- Encoding design theme or arbitrary colors
- Cryptographic signing / tamper detection (can add HMAC later if needed)
- Internationalization state

## Future Extensions
- Add `design` block (colors, shapes) with size guard → may require switching to lz-string for better compression ratio
- Add TTL or timestamp for ephemeral share links
- Add diff minimization vs base default to reduce token length further

## Testing Plan
- Roundtrip encode/decode various combinations
- Reject oversize and malformed tokens
- Deterministic ordering: different input orders produce identical token
- Version guard (simulate v=99)

## UI Notes
- Copy permalink button triggers buildPermalink with `window.location.origin + '/cv'`
- A subtle toast indicates success & length
- Fallback: show expanded query if compression fails (edge case)

---
Status: Draft implemented in `src/lib/cv/permalink.ts` with accompanying tests.
