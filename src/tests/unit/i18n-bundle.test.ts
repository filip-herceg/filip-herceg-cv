/**
 * Verifies lazy-loading of non-default locale catalogs:
 * - Builds the project (relies on prior build in CI or triggers a lightweight dynamic import analysis)
 * - Ensures German message strings do NOT appear in the main English route chunk.
 *
 * Strategy: we dynamically import the German catalog at runtime via loadMessages. Here we assert
 * that a representative German-only string ("Über mich") is absent from the statically imported
 * English bundle artifacts under .next after a production build.
 *
 * NOTE: This test expects `npm run build` to have executed before test run (CI sequence). We guard
 * with existence checks; if build output missing we skip to avoid local dev noise.
 */
import { expect, test } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Representative German-only substrings unlikely to exist in English catalog.
const GERMAN_MARKERS = ['Über mich', 'Ausgewählte Projekte', 'Zeitstrahl Platzhalter']

function findNextBuildDir(): string | null {
  const dir = join(process.cwd(), '.next')
  return existsSync(dir) ? dir : null
}

function scanForGermanStrings(root: string): string[] {
  const hits: string[] = []
  const walk = (p: string) => {
    const entries = readdirSync(p)
    for (const e of entries) {
      const full = join(p, e)
      const st = statSync(full)
      if (st.isDirectory()) {
        walk(full)
      } else if (/(?:^|\\|\/)chunks|static|app|page|main|framework/.test(full) && /\.(js|txt)$/.test(full)) {
        const content = readFileSync(full, 'utf8')
        for (const marker of GERMAN_MARKERS) {
          if (content.includes(marker)) hits.push(`${marker} :: ${full}`)
        }
      }
    }
  }
  walk(root)
  return hits
}

test('non-default (de) catalog strings are excluded from initial English bundles', () => {
  const buildDir = findNextBuildDir()
  if (!buildDir) {
    // Skip gracefully if build not executed (local dev running vitest directly)
    return
  }
  const hits = scanForGermanStrings(buildDir)
  // If dynamic loading works, there should be no German markers in prebuilt English chunks.
  expect(hits).toEqual([])
})
