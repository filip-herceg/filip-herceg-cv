/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['lucide-react'] },
  output: 'standalone',
  images: { formats: ['image/avif', 'image/webp'] },
  async redirects() {
    return [
      { source: '/site', destination: '/', permanent: true },
      { source: '/site/:path*', destination: '/:path*', permanent: true },
    ]
  },
}
export default nextConfig
