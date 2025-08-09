/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['lucide-react'] },
  output: 'standalone',
  images: { formats: ['image/avif','image/webp'] },
};
export default nextConfig;
