/**
 * Isi blog dengan tulisan contoh, halaman Tentang, dan tag (beserta fotonya).
 *   npm run seed                          (semua atas nama admin pertama)
 *   npm run seed -- --author email@contoh.id
 * Aman dijalankan ulang: tulisan yang alamatnya sudah ada akan dilewati.
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
