import type { MetadataRoute } from "next";
import { siteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const s = siteSettings();
  return {
    name: s.site_title,
    short_name: s.site_title,
    description: s.site_description,
    start_url: "/",
    display: "standalone",
    background_color: "#e3e2da",
    theme_color: "#161c1a",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
