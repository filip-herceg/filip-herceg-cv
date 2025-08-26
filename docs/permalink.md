# CV Permalink Token

This document describes the permalink (share token) system used for the CV short mode.

## Overview
Instead of exposing multiple verbose query parameters (mode, skills, projects, …) the app now encodes a compact token in the single query parameter `cv=<token>`.

Example: `/cv?cv=Hco9DoAgDAbQ...`.

## Encoding Steps
1. Selection object `{ mode?: 'short'; skills?: string[]; projects?: string[]; ... }` is sanitized:
   - Arrays de‑duplicated and sorted.
   - Empty arrays removed.
   - Only `mode === 'short'` persisted; any other value omitted.
2. JSON serialize the sanitized selection with stable key order.
3. (Optional) Compress with `CompressionStream('deflate-raw')` if available and smaller; otherwise raw bytes.
4. Base64url encode (unpadded) => token.
5. Client builds shareable URL `currentPath?cv=${token}`.

## Decoding Steps
1. Base64url decode -> bytes.
2. If bytes start with a deflate marker attempt `DecompressionStream('deflate-raw')`; on error fall back to original bytes (graceful).
3. Parse JSON.
4. Validate & coerce with `CvSelectionSchema` (rejects invalid shapes / values). Unknown or invalid pieces are dropped; failure yields `invalid_payload` error result.
5. Return `{ ok: true, preset } | { ok: false, reason }`.

## Error Reasons
- `missing`: no `cv` parameter provided.
- `b64`: malformed base64 input.
- `too_large`: raw decoded token length > 2048 bytes.
- `json`: JSON parse failed.
- `unsupported_version`: future version tag encountered.
- `invalid_payload`: JSON parsed but schema validation failed.

(`inflate` is effectively suppressed because decompression failures fall back to raw bytes.)

## Rationale
- Single param keeps shared URLs short & stable while the selection evolves.
- Base64url avoids `+`/`/` characters needing encoding and trims `=` padding.
- Size limit prevents abuse / extremely long URLs.
- Graceful decompression failure avoids hard 400s on legacy or partially corrupted tokens.

## Testing Notes
Unit tests cover:
- Round trip success.
- Each error branch (except suppressed inflate error path).
- Fallback to expanded query params helper `selectionFromExpanded` for backwards compatibility in print/export.
- Tokenized integration flows (URL update & clipboard copy).

## Backwards Compatibility
Legacy URLs with explicit `mode=short&skills=...&projects=...` still decode through `selectionFromExpanded` if no `cv` token is present. New links always prefer `cv`.

## Future Extensions
- Add checksum to detect truncated tokens.
- Version 2: delta encoding / bit packing for even shorter tokens.
- Optional encryption layer for private data variants.
