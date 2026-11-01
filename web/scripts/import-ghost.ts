/**
 * Impor tulisan, halaman, dan topik dari file ekspor Ghost.
 *   npm run import:ghost -- /path/ke/ekspor-ghost.json /opt/qiran-blog/data/ghost --author kakak@contoh.id
 * Argumen kedua (opsional) adalah folder konten Ghost, supaya gambar ikut disalin.
 * Tulisan yang alamatnya sudah ada akan dilewati, jadi aman dijalankan ulang.
 */
// Baca pengaturan produksi (DATA_DIR) kalau ada
try { process.loadEnvFile(".env.production"); } catch {}
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../lib/db";
import { savePost, upsertTag, getAnyBySlug } from "../lib/posts";
import { updateTag } from "../lib/posts";
import { storeImage } from "../lib/uploads";

type GhostPost = { id: string; title: string; slug: string; html: string | null; custom_excerpt: string | null; feature_image: string | null;
  status: string; published_at: string | null; type?: string; page?: boolean | number };
type GhostTag = { id: string; name: string; slug: string; description: string | null; visibility?: string };
type GhostMeta = { post_id: string; feature_image_alt: string | null; feature_image_caption: string | null };

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [jsonPath, contentDir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
  if (!jsonPath) throw new Error("Pakai: npm run import:ghost -- ekspor.json [folder-konten-ghost] --author email@admin");
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const data = (raw.db?.[0]?.data ?? raw.data) as { posts: GhostPost[]; tags?: GhostTag[]; posts_tags?: { post_id: string; tag_id: string; sort_order?: number }[]; posts_meta?: GhostMeta[] };

  const db = getDb();
  const authorEmail = arg("author");
  const author = (authorEmail
    ? db.prepare("SELECT id FROM users WHERE email = ?").get(authorEmail.toLowerCase())
    : db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get()) as { id: number } | undefined;
  if (!author) throw new Error("Buat akun admin dulu: npm run user -- add --email ... --name ... --role admin");

  const tagsById = new Map((data.tags ?? []).filter((t) => t.visibility !== "internal" && !t.name.startsWith("#")).map((t) => [t.id, t]));
  const metaByPost = new Map((data.posts_meta ?? []).map((m) => [m.post_id, m]));
  const imageCache = new Map<string, string>();

  async function localImage(url: string | null): Promise<string> {
    if (!url) return "";
    if (imageCache.has(url)) return imageCache.get(url)!;
    const m = /\/content\/(?:files\/)?images\/(.+)$/.exec(url.replace("__GHOST_URL__", ""));
    let out = url.replace("__GHOST_URL__", "");
    if (m && contentDir) {
      const candidates = [path.join(contentDir, "images", m[1]), path.join(contentDir, "files", "images", m[1])];
      const found = candidates.find((f) => fs.existsSync(f));
      if (found) out = await storeImage(fs.readFileSync(found), path.basename(found));
      else console.warn(`  gambar tidak ditemukan: ${m[1]}`);
    }
    imageCache.set(url, out);
    return out;
  }

  let added = 0, skipped = 0;
  for (const p of data.posts) {
    if (p.slug === "coming-soon") continue;
    if (getAnyBySlug(p.slug)) {
      console.log(`lewati (sudah ada): ${p.slug}`);
      skipped++;
      continue;
    }
    const isPage = p.type === "page" || p.page === true || p.page === 1;
    const tagNames = (data.posts_tags ?? [])
      .filter((pt) => pt.post_id === p.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((pt) => tagsById.get(pt.tag_id)?.name)
      .filter((n): n is string => !!n);
    let html = p.html ?? "";
    for (const m of html.matchAll(/src="([^"]*\/content\/(?:files\/)?images\/[^"]+)"/g)) html = html.replace(m[1], await localImage(m[1]));
    const meta = metaByPost.get(p.id);
    savePost({
      type: isPage ? "page" : "post",
      title: p.title,
      slug: p.slug,
      excerpt: p.custom_excerpt ?? "",
      html,
      featureImage: await localImage(p.feature_image),
      featureImageAlt: meta?.feature_image_alt ?? "",
      featureImageCaption: meta?.feature_image_caption ?? "",
      status: p.status === "published" ? "published" : "draft",
      publishedAt: p.published_at ? new Date(p.published_at).toISOString() : null,
      authorId: author.id,
      tags: isPage ? [] : tagNames,
    });
    console.log(`impor: ${isPage ? "halaman" : "tulisan"} ${p.slug}`);
    added++;
  }
  for (const t of tagsById.values()) {
    const tag = upsertTag(t.name);
    if (t.description) updateTag(tag.id, { name: tag.name, description: t.description });
  }
  console.log(`Selesai: ${added} diimpor, ${skipped} dilewati.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
