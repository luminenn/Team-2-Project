import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  /* Only small JSON calls travel through this proxy; cartridge uploads go
     directly to the backend (see uploadBase in lib/api/backend.ts), so the
     default proxy body limit is never in play. */
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
