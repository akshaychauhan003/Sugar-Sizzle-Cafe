/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl || backendUrl.startsWith('/')) return [];
    const base = backendUrl.trim().replace(/\/+$/, '');
    const target = base.endsWith('/api') ? base : `${base}/api`;
    return [
      {
        source: '/api/:path*',
        destination: `${target}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
