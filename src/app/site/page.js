// JS re-export of the TSX placeholder (kept temporarily during migration).
// IMPORTANT: Explicit .tsx extension to avoid this file re-importing itself (infinite loop)
// when the resolver prefers .js over .tsx. This prevents the stack overflow seen in tests.
export { default } from './page.tsx'

