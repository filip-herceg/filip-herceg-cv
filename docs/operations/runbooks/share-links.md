# Share links runbook

This app supports short, tokenized links for viewing the latest preset export.

How it works
- A POST to `/api/share/token` with `{ presetId, ttlSeconds? }` creates a DB record and returns a signed token.
- The short URL is `/s/<token>`. It verifies HMAC and expiry, checks DB record, and redirects to `/cv/print?presetId=...`.
- PDF generation can include a small QR code linking to the short URL when the `st` query param is provided to `/api/cv/pdf`.

Revocation
- Revoke by ID via `POST /api/share/revoke` with body `{ id }`.
- After revocation, `/s/<token>` responds `410` (revoked).

Notes
- Tokens are HMAC-signed with `SHARE_TOKEN_SECRET`. Rotate via config and mint new tokens.
- TTL defaults to 24h, min 60s, max 30 days.
- The resolver only supports scope `latest_preset_export` for now.
