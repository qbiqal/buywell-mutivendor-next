import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
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
