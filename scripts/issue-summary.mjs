#!/usr/bin/env node
/*
 Simple lint issue aggregator.
 Usage:
   npm run lint --silent --format json | node scripts/issue-summary.mjs
 (If eslint json formatter not configured, fallback: `eslint . -f json`.)
*/


async function readStdin() {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  return Buffer.concat(chunks).toString('utf8')
}

(async () => {
  const raw = await readStdin()
  let parsed
  try { parsed = JSON.parse(raw) } catch {
    console.error('Expected JSON eslint output on stdin.')
    process.exit(1)
  }
  const counts = {}
  const files = {}
  for (const file of parsed) {
    for (const m of file.messages) {
      if (!m.ruleId) continue
      counts[m.ruleId] = (counts[m.ruleId] || 0) + 1
      if (!files[m.ruleId]) files[m.ruleId] = {}
      files[m.ruleId][file.filePath] = (files[m.ruleId][file.filePath] || 0) + 1
    }
  }
  const summary = { generatedAt: new Date().toISOString(), totalRules: Object.keys(counts).length, totalIssues: Object.values(counts).reduce((a,b)=>a+b,0), counts, topRules: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,15), files }
  process.stdout.write(JSON.stringify(summary, null, 2))
})()
