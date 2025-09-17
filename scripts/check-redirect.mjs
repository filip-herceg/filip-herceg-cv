#!/usr/bin/env node
import { argv } from 'node:process'

async function main() {
  const url = argv[2]
  if (!url) {
    console.error('Usage: node scripts/check-redirect.mjs <url>')
    process.exit(2)
  }
  const res = await fetch(url, { redirect: 'manual' })
  const out = { status: res.status, location: res.headers.get('location') }
  console.log(JSON.stringify(out))
}

main().catch((err) => {
  console.error(err?.message || String(err))
  process.exit(1)
})
