---
title: Test DB fixtures policy (SQLite)
status: active
---

Purpose
- Keep the repo root clean of transient databases
- Standardize where ephemeral SQLite files live during tests

Where
- Ephemeral files: `src/tests/fixtures/db/tmp/` (created by tests; ignored by Git)
- Optional committed fixtures: `src/tests/fixtures/db/` with a README explaining purpose

Guidelines
- Compose DB URL as `file:${absPath}` pointing under `src/tests/fixtures/db/tmp/`
- Never write `*.sqlite` files in repository root
- Prefer migrations (`prisma db push`) and seeding over committing DB binaries

Example snippet
```ts
import path from 'node:path'
import fs from 'node:fs'

const dbDir = path.join(process.cwd(), 'src', 'tests', 'fixtures', 'db', 'tmp')
fs.mkdirSync(dbDir, { recursive: true })
const dbFile = path.join(dbDir, 'my-suite.sqlite')
process.env.DATABASE_URL = `file:${dbFile}`
// run prisma migrations/push as needed
```

CI
- Root hygiene guard will fail if new `*.sqlite` appear in the repo root
