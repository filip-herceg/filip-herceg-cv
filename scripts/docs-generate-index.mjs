#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const docsDir = join(root, 'docs');
const index = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue; // allow underscore ignore
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full); else if (name.endsWith('.md')) collect(full);
  }
}

function collect(path) {
  const rel = path.replace(root + '\\', '').replace(/\\/g, '/');
  const raw = readFileSync(path, 'utf8');
  const fm = /^---[\s\S]*?---/m.exec(raw)?.[0] || '';
  const meta = {};
  if (fm) {
    for (const line of fm.split(/\r?\n/)) {
      const m = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.+)$/.exec(line.trim());
      if (m) meta[m[1]] = m[2];
    }
  }
  index.push({ file: rel, title: meta.title || null, category: meta.category || null, status: meta.status || null, canonical: meta.canonical || null });
}

walk(docsDir);
index.sort((a,b)=>a.file.localeCompare(b.file));
process.stdout.write(JSON.stringify(index, null, 2));
