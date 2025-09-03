#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { exit } from 'node:process';

// Load alias table to know which files are forbidden
const aliasPath = 'docs/meta/legacy-aliases.md';
if (!existsSync(aliasPath)) {
  console.error('[docs-guard] legacy-aliases.md not found at', aliasPath, '; aborting check.');
  exit(1);
}

const raw = readFileSync(aliasPath, 'utf8');
// Extract first column of table rows (Old Path)
const removed = Array.from(raw.matchAll(/\|\s+(docs\/[^|]+?)\s+\|/g))
  .map(m => m[1].trim());

const legacySet = [...new Set(removed)].sort();

const existing = legacySet.filter(p => existsSync(p));
if (existing.length) {
  console.error('\n[docs-guard] ❌ Found legacy documentation files re-introduced:');
  for (const f of existing) console.error(' - ' + f);
  console.error('\nRemove these files. Canonical replacements are listed in', aliasPath + '.');
  exit(2);
}

console.log('[docs-guard] ✅ No legacy doc files present.');
