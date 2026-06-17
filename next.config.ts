import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // unoptimized: serve local public/ images directly (WebP files already optimised)
    // This avoids the Node 18+ localhost→IPv6 loopback issue in standalone containers
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.cloudflare.com" },
      { protocol: "https", hostname: "media.buywell.in" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
    ],
  },
  serverExternalPackages: ["pg"],
};

export default nextConfig;
