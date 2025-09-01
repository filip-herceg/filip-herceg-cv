// Ensures SQLite schema is applied before integration tests using Prisma run.
// This file should be imported at the very beginning of the test environment (configured in vitest.config.ts).
import { execSync } from 'node:child_process'

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA_DB_PUSHED__: boolean | undefined
}

// Only run once per test session.
if (!globalThis.__PRISMA_DB_PUSHED__) {
  const dbPath = process.env.TEST_SQLITE_DB_PATH || 'file:./test.db?connection_limit=1'
  process.env.DATABASE_URL = process.env.DATABASE_URL || dbPath
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
  globalThis.__PRISMA_DB_PUSHED__ = true
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to push Prisma schema for tests', err)
  }
}

export {}