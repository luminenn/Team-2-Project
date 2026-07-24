import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  /* Course cartridges are far larger than the 10MB default the proxy allows,
     and exceeding it kills the upload with a socket hang up. */
  experimental: {
    middlewareClientMaxBodySize: "512mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
