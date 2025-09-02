#!/usr/bin/env node
import { execSync } from 'node:child_process'

function run(cmd){
  try { return execSync(cmd,{stdio:'pipe'}).toString() } catch(e){ return e.stdout?.toString()||e.message }
}

const files = [
  'src/lib/otel-init.ts',
  'src/lib/tracing.ts'
]

console.log('== Direct JSON lint of target files ==')
for (const f of files) {
  const out = run(`npx eslint ${f} --format json`)
  console.log(`File: ${f}`)
  console.log(out)
}

console.log('\n== Print-config snippet (filter no-explicit-any) ==')
for (const f of files) {
  const out = run(`npx eslint --print-config ${f}`)
  const lines = out.split(/\r?\n/).filter(l=>/no-explicit-any/.test(l))
  console.log(`File: ${f}`)
  console.log(lines.join('\n')||'(rule line not found)')
}

console.log('\nDiagnostics complete.')
