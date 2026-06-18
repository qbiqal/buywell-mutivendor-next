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
  // Route /uploads/* through an API handler so files on the Docker-volume-mounted
  // public/uploads/ directory are served correctly. Next.js standalone refuses to
  // serve static files from a different filesystem device (the named volume), so
  // we bypass that restriction with an API route that uses fs.readFile directly.
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: "/api/media/serve/:path*" },
    ];
  },
  serverExternalPackages: ["pg"],
};

export default nextConfig;
