import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloudflare tunnel domain for Hot Module Replacement in dev
  allowedDevOrigins: ["menu.yarora.dev"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*'
      }
    ]
  }
};

export default nextConfig;
