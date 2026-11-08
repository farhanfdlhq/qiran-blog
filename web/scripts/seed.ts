/**
 * Isi blog dengan tulisan contoh, halaman Tentang, dan tag (beserta fotonya).
 *   npm run seed                          (semua atas nama admin pertama)
 *   npm run seed -- --author email@contoh.id
 * Aman dijalankan ulang: tulisan yang alamatnya sudah ada akan dilewati.
 *
 * Selain contoh di seed/content.json, setiap folder seed/<nama>/artikel.json berisi satu artikel lengkap
 * (gambar berketerangan, Daftar Pustaka, pengaturan PDF). Artikel itu dimasukkan atas nama akun dengan
 * slug `authorSlug` kalau ada, dan sebagai draf kalau `status` = "draft".
 */
// Baca pengaturan produksi (DATA_DIR) kalau ada
try { process.loadEnvFile(".env.production"); } catch {}
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../lib/db";
import { savePost, upsertTag, updateTag, getAnyBySlug } from "../lib/posts";
import { storeImage } from "../lib/uploads";

type SeedPost = { title: string; slug: string; tag: string; publishedAt: string; excerpt: string; html: string; image: string; imageCaption: string };
type Seed = { tags: Record<string, string>; posts: SeedPost[]; about: string };
type Article = {
  title: string; slug: string; authorSlug?: string; status?: "draft" | "published"; publishedAt?: string; tags: string[];
  excerpt: string; html: string; image?: string; imageAlt?: string; imageCaption?: string;
  pdfLabel?: string; pdfSubtitle?: string; pdfCover?: boolean; references?: string; sources?: unknown[];
};

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dir = path.join(process.cwd(), "seed");
  const seed = JSON.parse(fs.readFileSync(path.join(dir, "content.json"), "utf8")) as Seed;
  const db = getDb();
  const email = arg("author");
  const author = (email
    ? db.prepare("SELECT id, name FROM users WHERE email = ?").get(email.toLowerCase())
    : db.prepare("SELECT id, name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get()) as { id: number; name: string } | undefined;
  if (!author) throw new Error(email ? `Akun ${email} tidak ditemukan.` : "Belum ada akun admin. Buat dulu: npm run user -- add --email ... --name ... --role admin");
  console.log(`Mengisi contoh atas nama ${author.name} (data di ${process.env.DATA_DIR || "./data"})`);

  for (const [name, description] of Object.entries(seed.tags)) {
    const tag = upsertTag(name);
    if (!tag.description) updateTag(tag.id, { name: tag.name, description });
  }

  let added = 0;
  for (const p of seed.posts) {
    if (getAnyBySlug(p.slug)) {
      console.log(`  lewati (sudah ada): ${p.slug}`);
      continue;
    }
    const image = await storeImage(fs.readFileSync(path.join(dir, "images", p.image)), p.image);
    savePost({
      title: p.title, slug: p.slug, excerpt: p.excerpt, html: p.html,
      featureImage: image, featureImageAlt: p.title, featureImageCaption: p.imageCaption,
      status: "published", publishedAt: p.publishedAt, authorId: author.id, tags: [p.tag],
    });
    console.log(`  tulisan: ${p.slug}`);
    added++;
  }

  // Artikel lengkap di seed/<nama>/artikel.json
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name, "artikel.json");
    if (!entry.isDirectory() || !fs.existsSync(file)) continue;
    const a = JSON.parse(fs.readFileSync(file, "utf8")) as Article;
    const found = getAnyBySlug(a.slug);
    if (found) {
      // Daftar Pustaka yang belum pernah disunting dengan pengelola sumber diubah ke bentuk terstruktur
      if (a.sources && !found.references_json) {
        savePost({ id: found.id, title: found.title, slug: found.slug, allowComments: found.allow_comments === 1, status: found.status, publishedAt: found.published_at, authorId: found.author_id ?? author.id,
          tags: found.tags.map((t) => t.name), excerpt: found.excerpt, referencesJson: JSON.stringify(a.sources) });
        console.log(`  pustaka diperbarui: ${a.slug}`);
      } else console.log(`  lewati (sudah ada): ${a.slug}`);
      continue;
    }
    const folder = path.join(dir, entry.name);
    const owner = (a.authorSlug ? db.prepare("SELECT id, name FROM users WHERE slug = ?").get(a.authorSlug) : undefined) as { id: number; name: string } | undefined;
    // Gambar di dalam tulisan ditulis sebagai {{gambar:nama-file.jpg}}, diunggah lalu diganti alamatnya
    let html = a.html;
    for (const m of [...html.matchAll(/\{\{gambar:([\w.-]+)\}\}/g)]) {
      html = html.replace(m[0], await storeImage(fs.readFileSync(path.join(folder, m[1])), m[1]));
    }
    const image = a.image ? await storeImage(fs.readFileSync(path.join(folder, a.image)), a.image) : "";
    savePost({
      title: a.title, slug: a.slug, excerpt: a.excerpt, html,
      featureImage: image, featureImageAlt: a.imageAlt ?? a.title, featureImageCaption: a.imageCaption ?? "",
      status: a.status ?? "published", publishedAt: a.publishedAt ?? null, authorId: (owner ?? author).id, tags: a.tags,
      pdfLabel: a.pdfLabel, pdfSubtitle: a.pdfSubtitle, pdfCover: a.pdfCover,
      ...(a.sources ? { referencesJson: JSON.stringify(a.sources) } : { referencesText: a.references }),
    });
    console.log(`  artikel: ${a.slug} (${a.status === "draft" ? "draf" : "terbit"}, atas nama ${(owner ?? author).name})`);
    added++;
  }

  if (!getAnyBySlug("tentang")) {
    savePost({ type: "page", title: "Tentang", slug: "tentang", excerpt: "Siapa kami dan apa yang kami tulis di sini.", html: seed.about, status: "published", authorId: author.id, tags: [] });
    console.log("  halaman: tentang");
    added++;
  } else console.log("  lewati (sudah ada): tentang");

  console.log(`Selesai: ${added} ditambahkan.`);
}

main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
