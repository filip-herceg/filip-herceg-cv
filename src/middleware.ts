import { NextResponse } from 'next/server'

// Generate a simple base64 nonce per response for CSP
function generateNonce() {
  // Edge runtime friendly: UUID without dashes
  return crypto.randomUUID().replace(/-/g, '')
}

export function middleware(req: Request) {
  const url = new URL(req.url)
  // Skip CSP/headers for static asset paths to minimize overhead
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/public/')) {
    return NextResponse.next()
  }
  // Correlation id (reuse if client supplies x-request-id; otherwise generate)
  const incomingId = (req.headers).get('x-request-id') || crypto.randomUUID()
  const nonce = generateNonce()
  const res = NextResponse.next({
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=()',
      // 1 year HSTS, include subdomains, preload candidate (toggle preload via env if desired later)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'x-request-id': incomingId,
    },
  })
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    // Disallow inline scripts except those carrying our nonce
    `script-src 'self' 'nonce-${nonce}'`,
    // Allow nonce styles plus safe inline for Tailwind (could be tightened later)
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)
  // Expose nonce so it can be injected into <style> / <script> tags if needed
  // Provide nonce header only in non-production to aid local debugging (avoid leaking in prod logs)
  if (process.env.NODE_ENV !== 'production') res.headers.set('x-csp-nonce', nonce)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
