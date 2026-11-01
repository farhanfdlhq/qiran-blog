import fs from "node:fs";
import path from "node:path";
import { getPublishedBySlug } from "@/lib/posts";
import { siteSettings } from "@/lib/settings";
import { ogImageFor } from "@/lib/og";

export const dynamic = "force-dynamic";

/** /og/<slug>.jpg: gambar pratinjau tulisan untuk WhatsApp, Facebook, X, dan lainnya. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const m = (await params).file.match(/^([a-z0-9][a-z0-9-]{0,190})\.jpg$/);
  // Hanya tulisan yang sudah terbit: judul draf tidak boleh bocor lewat gambar
  const post = m ? getPublishedBySlug(m[1]) : null;
  if (!post) return new Response("Tidak ditemukan", { status: 404 });

  try {
    const jpg = await ogImageFor(post, siteSettings().site_title);
    return new Response(new Uint8Array(jpg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    // Font belum bisa diunduh atau render gagal: pakai gambar umum situs
    console.error("[og] gagal membuat gambar untuk", post.slug, err);
    const fallback = await fs.promises.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "og.png"));
    return new Response(new Uint8Array(fallback), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } });
  }
}
