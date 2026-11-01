import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Alamat sama dengan Ghost lama (/judul-tulisan/), jadi tautan lama tetap jalan
  trailingSlash: true,
  serverExternalPackages: ["better-sqlite3", "sharp"],
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
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/rss/", destination: "/rss.xml", permanent: true },
      { source: "/ghost/", destination: "/admin/", permanent: false },
    ];
  },
};

export default nextConfig;
