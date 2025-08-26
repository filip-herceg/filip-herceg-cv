/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed standalone output for now to avoid missing route modules in packaged start; default output works with tests.
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        // Cache public assets aggressively
        source: '/:all*(svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|pdf)'
        , headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        // Cache static HTML for a short time at CDN edge; allow long SWR
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/about',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/projects',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Contact form HTML is static; API handles submission dynamics
        source: '/contact',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=86400' },
        ],
      },
    ]
  },
}

export default nextConfig
