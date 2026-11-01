/** Metadata bersama untuk pratinjau saat dibagikan (Open Graph dan kartu X/Twitter). */
import type { Metadata } from "next";
import { siteSettings } from "./settings";

type Share = {
  title: string;
  description?: string;
  path: string;
  /** Gambar 1200x630. Kosong berarti gambar umum situs. */
  image?: { url: string; alt: string; type?: string };
  article?: { publishedTime?: string; modifiedTime?: string; authors?: string[]; tags?: string[] };
};

export const DEFAULT_OG_IMAGE = { url: "/og.png", alt: "", type: "image/png" };

export function shareMeta({ title, description, path, image, article }: Share): Pick<Metadata, "openGraph" | "twitter"> {
  const s = siteSettings();
  const img = image ?? { ...DEFAULT_OG_IMAGE, alt: s.site_title };
  const images = [{ url: img.url, width: 1200, height: 630, alt: img.alt, type: img.type ?? "image/jpeg" }];
  const base = { siteName: s.site_title, locale: "id_ID", title, description, url: path, images };
  return {
    openGraph: article ? { ...base, type: "article", ...article } : { ...base, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [{ url: img.url, alt: img.alt }] },
  };
}
