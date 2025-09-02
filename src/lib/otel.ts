// Transitional shim: retained file name after rename to otel-init.
// Auto-expiration: warn (non-prod) after 2025-10-01 if still imported.
// Cleanup note (target removal date 2025-10-01): delete this shim and update imports to '@/lib/otel-init'.

const EXPIRATION_EPOCH_MS = Date.UTC(2025, 9, 1) // 2025-10-01T00:00:00Z (month 0-based)
if (Date.now() > EXPIRATION_EPOCH_MS && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn('[otel shim] Expired shim src/lib/otel.ts still in use; remove file and switch to "otel-init".')
}

export * from './otel-init'
