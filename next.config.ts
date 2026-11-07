import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${(process.env.API_URL || 'https://api.barwaqt.com/api/v1').replace(/\/api\/v1\/?$/, '')}/uploads/:path*`,
      },
    ];
  },
};
export default nextConfig;
