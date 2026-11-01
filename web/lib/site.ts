/** Helper situs publik. */
export function siteUrl(path = ""): string {
  const base = (process.env.SITE_URL || "http://localhost:3100").replace(/\/+$/, "");
  return base + (path.startsWith("/") ? path : "/" + path);
}

export const IMAGE_WIDTHS = [720, 1400] as const;

/** Versi kecil gambar unggahan: /uploads/x.jpg → /uploads/x-w720.jpg. Gambar dari luar dibiarkan. */
export function imgVariant(url: string, width: (typeof IMAGE_WIDTHS)[number]): string {
  if (!url.startsWith("/uploads/")) return url;
  return url.replace(/\.(jpe?g|png|webp)$/i, `-w${width}.$1`);
}

export function imgSrcSet(url: string): string | undefined {
  if (!url.startsWith("/uploads/")) return undefined;
  return `${imgVariant(url, 720)} 720w, ${imgVariant(url, 1400)} 1400w, ${url} 2000w`;
}

export function postPath(slug: string) {
  return `/${slug}/`;
}
