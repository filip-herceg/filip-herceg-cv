import { NextResponse } from 'next/server'

// Generate a simple base64 nonce per response for CSP
function generateNonce() {
  // Edge runtime friendly: UUID without dashes
  return crypto.randomUUID().replace(/-/g, '')
}

export function middleware() {
  const nonce = generateNonce()
  const res = NextResponse.next({
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=()',
    },
  })
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    // Disallow inline scripts/styles except those with the generated nonce.
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)
  // Expose nonce so it can be injected into <style> / <script> tags if needed
  res.headers.set('x-csp-nonce', nonce)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
