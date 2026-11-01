import { listAllPublishedForFeeds, excerptOf } from "@/lib/posts";
import { siteSettings } from "@/lib/settings";
import { escapeHtml } from "@/lib/text";
import { siteUrl, postPath } from "@/lib/site";

export const dynamic = "force-dynamic";

export function GET() {
  const s = siteSettings();
  const posts = listAllPublishedForFeeds().filter((p) => p.type === "post").slice(0, 20);
  // Gambar dan tautan relatif dijadikan alamat lengkap agar tampil di pembaca RSS
  const absolutize = (html: string) => html.replace(/(src|href)="\//g, `$1="${siteUrl("/")}`);
  const items = posts
    .map((p) => `
    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${siteUrl(postPath(p.slug))}</link>
      <guid isPermaLink="true">${siteUrl(postPath(p.slug))}</guid>
      <pubDate>${new Date(p.published_at!).toUTCString()}</pubDate>
      ${p.author ? `<dc:creator>${escapeHtml(p.author.name)}</dc:creator>` : ""}
      ${p.tags.map((t) => `<category>${escapeHtml(t.name)}</category>`).join("")}
      <description>${escapeHtml(excerptOf(p, 300))}</description>
      <content:encoded><![CDATA[${absolutize(p.content_html).replace(/]]>/g, "]]]]><![CDATA[>")}]]></content:encoded>
    </item>`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeHtml(s.site_title)}</title>
    <link>${siteUrl("/")}</link>
    <description>${escapeHtml(s.site_description)}</description>
    <language>id</language>
    <atom:link href="${siteUrl("/rss.xml")}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
