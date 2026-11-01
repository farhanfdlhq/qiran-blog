import type { MetadataRoute } from "next";
import { listAllPublishedForFeeds, listTags } from "@/lib/posts";
import { listUsers } from "@/lib/users";
import { siteUrl, postPath } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = listAllPublishedForFeeds();
  const latest = posts[0]?.updated_at;
  return [
    { url: siteUrl("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    ...posts.map((p) => ({
      url: siteUrl(postPath(p.slug)),
      lastModified: p.updated_at,
      priority: p.type === "post" ? 0.8 : 0.5,
      images: p.feature_image ? [siteUrl(p.feature_image)] : undefined,
    })),
    ...listTags().filter((t) => t.count > 0).map((t) => ({ url: siteUrl(`/tag/${t.slug}/`), priority: 0.4 })),
    ...listUsers().filter((u) => u.post_count > 0).map((u) => ({ url: siteUrl(`/author/${u.slug}/`), priority: 0.3 })),
  ];
}
