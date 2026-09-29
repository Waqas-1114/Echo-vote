import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The Express API (../backend). Browser code calls relative /api/* URLs and
// Next.js forwards them, so no CORS setup or API URL is needed in the pages.
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
