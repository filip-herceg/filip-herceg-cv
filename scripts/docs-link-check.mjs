#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';

const root = process.cwd();
const docsDir = join(root, 'docs');
const mdFiles = [];
function walk(p) {
  for (const e of readdirSync(p)) {
    const full = join(p, e);
    const st = statSync(full);
    if (st.isDirectory()) walk(full); else if (e.endsWith('.md')) mdFiles.push(full);
  }
}
walk(docsDir);

const linkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
let missing = [];
let legacyLinkRefs = [];

// Legacy root stub markdown file names (now deleted or pending deletion)
const legacyRootStubs = new Set([
  'vision-mission.md','taxonomy.md','search-spec.md','permalink-spec.md','export-matrix.md','i18n-seo-phase2.md','permalink.md','phase-2-roadmap.md','refactor-plan.md','refactor-rate-limiter.md','cv-integration-plan.md','cv-persistence-i18n-plan.md','task-4-permalink-status.md','task-6-perf-a11y-budgets.md','task-7-logging-privacy.md','admin.md','observability.md','persistence.md','kubernetes.md','architecture.md','development.md','cicd.md','ci-cd-review.md','operations.md'
]);

for (const file of mdFiles) {
  const content = readFileSync(file, 'utf8');
  const relBase = dirname(file);
  let match;
  while ((match = linkRegex.exec(content))) {
    let target = match[1].split('#')[0];
    if (!target || target.startsWith('http') || target.startsWith('#') || target.startsWith('mailto:')) continue;
    if (target.startsWith('/')) continue; // site-absolute
    const resolved = resolve(relBase, target);
    try {
      statSync(resolved);
    } catch {
      missing.push({ file, target });
    }
    // Detect markdown links that point directly to a legacy root stub path (no directory component or docs/<file>)
    const normalized = target.replace(/^\.\/?/, '').replace(/^docs\//, '');
    if (legacyRootStubs.has(normalized)) {
      legacyLinkRefs.push({ file, target });
    }
  }
}

if (missing.length) {
  console.error('Broken doc links found:');
  for (const m of missing) console.error('-', m.file, '->', m.target);
}
if (legacyLinkRefs.length) {
  console.warn('Markdown links referencing legacy stub files (update to canonical paths):');
  for (const r of legacyLinkRefs) console.warn('-', r.file, '->', r.target);
}

if (missing.length) {
  process.exitCode = 1;
}
else {
  console.log('Docs link check passed.');
  if (legacyLinkRefs.length === 0) console.log('No legacy stub link references detected.');
}
