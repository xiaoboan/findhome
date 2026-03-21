/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => Date.now().toString(),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
