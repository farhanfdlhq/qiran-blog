import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build bisa diarahkan ke folder lain (dipakai scripts/deploy.sh) supaya situs tetap jalan selama build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Alamat sama dengan Ghost lama (/judul-tulisan/), jadi tautan lama tetap jalan
  trailingSlash: true,
  serverExternalPackages: ["better-sqlite3", "sharp", "playwright-core", "pdf-lib"],
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
              "font-src 'self' https://cdn.fontshare.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self'",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/rss/", destination: "/rss.xml", permanent: true },
      { source: "/ikuti/", destination: "/", permanent: false },
      { source: "/ghost/", destination: "/admin/", permanent: false },
    ];
  },
};

export default nextConfig;
