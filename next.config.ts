import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const todoUrl = process.env.TODO_APP_URL?.replace(/\/$/, '');
const localDevOrigins = Object.values(networkInterfaces())
  .flatMap(entries => entries || [])
  .filter(entry => entry.family === 'IPv4' && !entry.internal)
  .map(entry => entry.address);
const configuredDevOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) || [];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: [...new Set([...localDevOrigins, ...configuredDevOrigins])],
  async rewrites() {
    if (!todoUrl) {
      console.warn("⚠️ TODO_APP_URL is not set in .env.local. The TODO Tracker app proxy will be disabled.");
      return [];
    }

    return [
      // The main HTML for the TODO app
      {
        source: '/todo-proxy',
        destination: `${todoUrl}/`,
      },
      {
        source: '/todo-proxy/:path*',
        destination: `${todoUrl}/:path*`,
      },
      // Proxies the assets (JS/CSS) the TODO app requests
      {
        source: '/assets/:path*',
        destination: `${todoUrl}/assets/:path*`,
      },
      // Proxies the API requests the TODO app makes
      {
        source: '/api/places',
        destination: `${todoUrl}/api/places`,
      },
      // Proxies SVGs/Icons requested by the TODO app
      {
        source: '/texas_flag_map.svg',
        destination: `${todoUrl}/texas_flag_map.svg`,
      }
    ];
  },
};

export default nextConfig;
