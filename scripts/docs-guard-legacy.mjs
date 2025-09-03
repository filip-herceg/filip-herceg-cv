#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { exit } from 'node:process';

// Load alias table to know which files are forbidden
const aliasPath = 'docs/legacy-aliases.md';
if (!existsSync(aliasPath)) {
  console.error('[docs-guard] legacy-aliases.md not found; aborting check.');
  exit(1);
}

const raw = readFileSync(aliasPath, 'utf8');
// Extract first column of table rows (Removed Path)
const removed = Array.from(raw.matchAll(/\|\s+([^|]+?)\s+\|\s+docs\//g))
  .map(m => m[1].trim())
  .filter(p => p.startsWith('docs/'));

// Deduplicate
const legacySet = [...new Set(removed)].sort();

// Detect any that still exist in repo
const existing = legacySet.filter(p => existsSync(p));
if (existing.length) {
  console.error('\n[docs-guard] ❌ Found legacy documentation files re-introduced:');
  for (const f of existing) console.error(' - ' + f);
  console.error('\nRemove these files. Canonical replacements are listed in docs/legacy-aliases.md.');
  exit(2);
}

console.log('[docs-guard] ✅ No legacy doc files present.');
